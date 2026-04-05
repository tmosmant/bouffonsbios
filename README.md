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
| Déploiement (page dédiée) | <https://bouffonsbios.org/admin/deploy.html> |
| OAuth GitHub (proxy) | <https://bouffonsbios-oauth.thomas-mosmant.workers.dev> |

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

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) ne tourne **plus** au push : il est lancé **à la demande** (page `/admin/deploy.html`, *Run workflow* sur GitHub, ou `npm run deploy` en local).

### Bouton dans l’admin

1. Ouvre <https://bouffonsbios.org/admin/deploy.html> (page dédiée, pas dans l’interface Decap).
2. Saisis la **clé de déploiement** (la même valeur que le secret Worker `DEPLOY_TRIGGER_SECRET`).
3. Le site appelle `POST /api/deploy`, qui déclenche **`workflow_dispatch`** sur GitHub Actions (branche `main`).

**Secrets sur le Worker `bouffonsbios`** (Cloudflare → *Workers* → *bouffonsbios* → *Settings* → *Variables and Secrets* → *Encrypt* pour les secrets) :

| Nom | Type | Rôle |
|-----|------|------|
| `DEPLOY_TRIGGER_SECRET` | Secret | Chaîne longue et aléatoire ; connue de l’équipe, saisie sur la page deploy |
| `GITHUB_DISPATCH_TOKEN` | Secret | [PAT GitHub](https://github.com/settings/personal-access-tokens) **fine-grained** sur le dépôt `bouffonsbios`, permission **Actions : Read and write** (pour l’API `workflow_dispatch`) |

Exemple en CLI :

```sh
npx wrangler secret put DEPLOY_TRIGGER_SECRET
npx wrangler secret put GITHUB_DISPATCH_TOKEN
```

En local (`wrangler dev`), copier [`.dev.vars.example`](.dev.vars.example) vers `.dev.vars` (fichier ignoré par Git) et y renseigner les mêmes noms.

### GitHub Actions (secrets du dépôt)

Quand le workflow s’exécute, il a besoin des secrets **du dépôt GitHub** (*Settings* → *Secrets and variables* → *Actions*) :

| Nom | Obligatoire | Rôle |
|-----|-------------|------|
| `CLOUDFLARE_API_TOKEN` | oui | [API Token](https://dash.cloudflare.com/profile/api-tokens) Cloudflare — déploiement Workers |
| `PUBLIC_MAPBOX_ACCESS_TOKEN` | non | Build CI si nécessaire ; la carte en prod lit surtout la variable du Worker |

Tu peux aussi lancer le workflow à la main : *Actions* → *Deploy* → *Run workflow*.

Les identifiants **OAuth Decap** (`GITHUB_OAUTH_ID` / `GITHUB_OAUTH_SECRET`) restent sur le worker **`bouffonsbios-oauth`** uniquement — pas sur le worker site, pas dans ce PAT de dispatch.

### En local (sans passer par GitHub Actions)

```sh
npm run deploy              # site (build + wrangler racine)
npm run deploy:oauth        # worker OAuth seul
```

## Infra Cloudflare

| Élément | Fichier / nom |
|---------|----------------|
| Site + API Astro | `wrangler.jsonc` → worker **bouffonsbios** (incl. `POST /api/deploy`) |
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

3. **Code du worker OAuth** : après changement sous `workers/decap-oauth/`, lancer un déploiement (*Run workflow*, page `/admin/deploy.html`, ou `npm run deploy:oauth`).

4. **Site + contenu** : après merge sur `main`, lancer un déploiement (*Run workflow*, page `/admin/deploy.html`, ou `npm run deploy`). La page deploy rebuild depuis la branche `main` distante, pas depuis des fichiers non poussés.

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
