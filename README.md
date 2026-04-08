# Bouffons Bios

Site [Astro](https://astro.build) + [Decap CMS](https://decapcms.org), déployé sur **Cloudflare Workers** (Worker Astro + assets statiques).

**Domaine de prod** : [bouffonsbios.org](https://bouffonsbios.org) (**Bios** avec un **s** — pas `bouffonsbio.org`).

## Prérequis

- **Node** ≥ 22.12 (voir `package.json` → `engines`)

## URLs

| Ressource | URL |
|-----------|-----|
| Site (prod) | <https://bouffonsbios.org> · <https://www.bouffonsbios.org> |
| Alias Workers | <https://bouffonsbios.thomas-mosmant.workers.dev> |
| Admin Decap | <https://bouffonsbios.org/admin/> |
| OAuth GitHub (proxy) | <https://bouffonsbios-oauth.thomas-mosmant.workers.dev> |
| Déploiements (historique / retry) | [Workers & Pages](https://dash.cloudflare.com/) → worker concerné → *Deployments* |

## Développement

```sh
npm install
npm run dev
```

- Site : <http://localhost:4321>
- Admin : <http://localhost:4321/admin/> — avec `local_backend: true` dans `public/admin/config.yml`, prévoir le [mode local Decap](https://decapcms.org/docs/working-with-a-local-git-repository/) si tu édites le dépôt Git depuis ta machine.

### Carte Mapbox (plan d’accès)

La page `/plan-dacces/` utilise [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) (style hébergé sur ton compte Mapbox).

- **En local** : copier `.env.example` vers `.env` et renseigner `PUBLIC_MAPBOX_ACCESS_TOKEN=pk.…`
- **Sur le Worker `bouffonsbios`** : ajouter la même variable dans Cloudflare (*Workers* → *bouffonsbios* → *Settings* → *Variables and Secrets*). La page est rendue côté serveur : le jeton doit être présent **sur le Worker**, pas seulement au build CI.
- Restreindre le jeton par URL dans [Mapbox Account](https://account.mapbox.com/).

## Déploiement

En production, le déploiement est déclenché **sur Cloudflare** à chaque push sur **`main`** : [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/) clone le dépôt, exécute les commandes configurées dans le dashboard, puis lance Wrangler. **Aucun GitHub Actions** n’est utilisé pour ça.

### Worker site (`bouffonsbios`)

À configurer une fois dans le dashboard Cloudflare (*Workers & Pages* → **bouffonsbios** → *Settings* → *Builds* / *Connect to Git*, libellés selon l’interface) :

| Réglage | Valeur |
|--------|--------|
| Dépôt | `tmosmant/bouffonsbios` |
| Branche prod | `main` |
| Build command | `npm install && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Racine du projet | `.` (racine du dépôt) |

**Build command** : `npm install` suffit en général pour un dépôt solo (souvent un peu plus rapide que `npm ci`, qui supprime toujours `node_modules` avant de réinstaller). Pour une CI très stricte sur le lockfile, tu peux utiliser `npm ci && npm run build` à la place. Il faut **au moins** une install avant `npm run build` : sans `node_modules`, le build échoue.

Active aussi **Build cache** (*Settings* → *Build* → *Build cache*) pour réutiliser le cache npm (`.npm`) et le cache Astro (`.astro`).

**Variables de build** (même écran, *Build variables* / secrets de build) : ajouter `PUBLIC_MAPBOX_ACCESS_TOKEN` si le build en a besoin. En runtime, la carte utilise surtout la variable **sur le Worker** (voir section Mapbox ci-dessus).

Cloudflare fournit en général un **API token** dédié aux builds ; tu n’as pas besoin de `CLOUDFLARE_API_TOKEN` côté GitHub.

### Worker OAuth Decap (`bouffonsbios-oauth`)

Créer un **second** Worker lié au **même** dépôt et à **`main`**, avec par exemple :

| Réglage | Valeur |
|--------|--------|
| Build command | `npm install` |
| Deploy command | `npx wrangler deploy -c workers/decap-oauth/wrangler.jsonc` |

Ainsi un push sur `main` met à jour les deux workers. Si tu préfères ne déployer l’OAuth qu’à la main, omettre la connexion Git sur ce worker et utiliser uniquement `npm run deploy:oauth` après changement sous `workers/decap-oauth/`.

### En local

```sh
npm run deploy              # site (build + wrangler à la racine)
npm run deploy:oauth        # worker OAuth seul
```

En local (`wrangler dev`), copier [`.dev.vars.example`](.dev.vars.example) vers `.dev.vars` (ignoré par Git) pour `PUBLIC_MAPBOX_ACCESS_TOKEN`.

## Infra Cloudflare

| Élément | Fichier / nom |
|---------|----------------|
| Site + API Astro | `wrangler.jsonc` → worker **bouffonsbios** |
| OAuth Decap | `workers/decap-oauth/wrangler.jsonc` → **bouffonsbios-oauth** |
| Newsletter (D1) | Binding `NEWSLETTER_DB` dans `wrangler.jsonc` ; schéma SQL dans `schema/` |

## Decap + GitHub en production

1. **GitHub** → *Settings* → *Developer settings* → *OAuth Apps* → *New OAuth App*  
   - **Homepage URL** : `https://bouffonsbios.org`  
   - **Authorization callback URL** :  
     `https://bouffonsbios-oauth.thomas-mosmant.workers.dev/callback?provider=github`  
   - Scopes : `public_repo`, `user`, `user:email` (e-mails vérifiés → avatar Gravatar côté admin). Après changement de scopes, chaque éditeur doit se **reconnecter** une fois.

2. **Cloudflare** — worker **`bouffonsbios-oauth`** :

   ```sh
   npx wrangler secret put GITHUB_OAUTH_SECRET -c workers/decap-oauth/wrangler.jsonc
   npx wrangler vars put GITHUB_OAUTH_ID -c workers/decap-oauth/wrangler.jsonc
   ```

   Client ID → variable, client secret → secret. **Ne pas** commiter ces valeurs dans `wrangler.jsonc` : les gérer via `wrangler` ou le dashboard.

3. **Code du worker OAuth** : après changement sous `workers/decap-oauth/`, pousser sur `main` (si ce worker est branché aux *Workers Builds*) ou lancer `npm run deploy:oauth`.

4. **Site + contenu** : après push sur `main`, Cloudflare rebuild depuis le dépôt distant — les changements non poussés ne partent pas en prod.

Si l’URL du worker OAuth change, mettre à jour `ALLOWED_ORIGINS` dans `public/admin/decap-gravatar.js`.

Sans l’étape 2, `/auth` sur le worker OAuth répond **503** avec un message explicite.

## Contenu & CMS

Fichiers éditables via **Decap** (`/admin/`) ou à la main ; schéma Zod : `src/content.config.ts`. Après gros changements de schéma : `npx astro sync`.

| Zone | Emplacement |
|------|-------------|
| Articles | `src/content/articles/*.md` |
| Accueil (héros, CTA, etc.) | `src/content/home.json` |
| Menu principal | `src/content/navigation.json` (`nav.items` : `id`, `title`, `href`, `emphasized`) |
| Bandeau flash | `src/content/flash.json` |
| Contact | `src/content/contact.json` |
| Manifeste | `src/content/manifeste.json` |
| Bloc presse (accueil) | `src/content/presse.json` |
| Médias | `public/uploads/` |

Les **`id`** des liens de navigation doivent rester alignés avec le prop `current` des pages dans `src/pages/` (ex. `highlight`, `articles`, `manifeste`, `contact`, `plan`) pour l’état actif du menu.

### Scripts npm

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de dev Astro |
| `npm run build` | Build production → `dist/` |
| `npm run deploy` | Build + `wrangler deploy` (site) |
| `npm run deploy:oauth` | Déploie uniquement le worker OAuth |
| `npm run import:wp` | Import WordPress (WXR) → articles Markdown |
| `npm run assign:categories` | Recalcule les catégories depuis les slugs de fichiers |
| `npm run generate-types` | `wrangler types` (bindings Worker) |

### Import WordPress (WXR)

Export **Outils → Exporter** (`.xml`) : titre, dates, catégories, extrait, contenu → front matter + Markdown.

```sh
npm run import:wp -- /chemin/vers/export.xml
```

Sans argument : recherche par défaut `~/Downloads/bouffonsbios.WordPress.YYYY-MM-DD.xml`. **Remplace** les `.md` du dossier articles (billets publiés uniquement). Liens `bouffonsbios.wordpress.com` → `https://bouffonsbios.org`. Images WordPress en hotlink `*.files.wordpress.com` tant qu’elles y sont servies.

### Catégories (sans réimporter le WXR)

```sh
npm run assign:categories
```

## Dépôt

<https://github.com/tmosmant/bouffonsbios>
