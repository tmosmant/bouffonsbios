# Bouffons Bios

Site [Astro](https://astro.build) + [Decap CMS](https://decapcms.org), déployé sur **Cloudflare Workers** (assets statiques + worker Astro).

**Domaine de prod** : [bouffonsbios.org](https://bouffonsbios.org) (**Bios** avec un **s** — pas `bouffonsbio.org`).

## URLs

| Ressource | URL |
|-----------|-----|
| Site (prod) | <https://bouffonsbios.org> · <https://www.bouffonsbios.org> |
| Alias Workers | <https://bouffonsbios.thomas-mosmant.workers.dev> |
| Admin Decap | <https://bouffonsbios.org/admin/> |
| OAuth GitHub (proxy) | <https://bouffonsbios-oauth.thomas-mosmant.workers.dev> |

## Développement

```sh
npm install
npm run dev
```

- Site : <http://localhost:4321>
- Admin : <http://localhost:4321/admin/> (`local_backend: true` → en local, prévoir [Decap server](https://decapcms.org/docs/working-with-a-local-git-repository/) si besoin)

### Carte Mapbox (plan d’accès)

La page `/plan-dacces/` charge [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) avec un style hébergé sur ton compte.

- **En local** : copier `.env.example` vers `.env` et renseigner `PUBLIC_MAPBOX_ACCESS_TOKEN=pk.…` (Astro charge ce fichier au dev / au build).
- **Sur Cloudflare Workers** (déploiement `wrangler deploy`) : ajouter la variable **`PUBLIC_MAPBOX_ACCESS_TOKEN`** dans le tableau de bord du worker **bouffonsbios** (*Settings* → *Variables and Secrets*), pas seulement au « build » Git. La page est rendue côté serveur et lit le jeton à chaque requête via l’env Worker ; un jeton défini uniquement au build CI ne suffit pas.
- Restreindre le jeton par URL dans [Mapbox Account](https://account.mapbox.com/).

## Déploiement

```sh
npm run deploy
```

Worker OAuth (séparé) :

```sh
npm run deploy:oauth
```

## Decap + GitHub en production

1. **GitHub** → *Settings* → *Developer settings* → *OAuth Apps* → *New OAuth App*  
   - **Homepage URL** : `https://bouffonsbios.org`  
   - **Authorization callback URL** :  
     `https://bouffonsbios-oauth.thomas-mosmant.workers.dev/callback?provider=github`

2. **Cloudflare** — sur le worker `bouffonsbios-oauth` :

   ```sh
   npx wrangler secret put GITHUB_OAUTH_SECRET -c workers/decap-oauth/wrangler.jsonc
   npx wrangler vars put GITHUB_OAUTH_ID -c workers/decap-oauth/wrangler.jsonc
   ```

   Colle le **Client ID** pour la variable, le **Client secret** pour le secret.

   Ne mets **pas** `GITHUB_OAUTH_ID` dans `workers/decap-oauth/wrangler.jsonc` : un déploiement écraserait sinon les variables du dashboard. Configure-les uniquement via les commandes ci-dessus ou l’UI Cloudflare.

3. Redéploie le site après modification de `public/admin/config.yml` : `npm run deploy`.

Tant que l’étape 2 n’est pas faite, `/auth` sur le worker OAuth répond **503** avec un message explicite.

## Contenu

- Articles : `src/content/articles/` (Markdown + front matter)
- Médias Decap : `public/uploads/`

Schéma Astro : `src/content.config.ts` — après gros changements : `npx astro sync`.

### Import WordPress (WXR)

L’export **Outils → Exporter** (fichier `.xml`) est compatible : champs `title`, `wp:post_date_gmt` / `wp:post_date`, catégories WordPress, `excerpt:encoded`, `content:encoded` → front matter + corps Markdown.

```sh
npm run import:wp -- /chemin/vers/export.xml
```

Sans argument, le script cherche par défaut `~/Downloads/bouffonsbios.WordPress.YYYY-MM-DD.xml`. Il **remplace** tous les `.md` du dossier `articles` (billets `post` publiés uniquement ; pas les pages type Accueil / Contact, ni les commentaires). Les blocs Gutenberg (`<!-- wp:… -->`) sont retirés ; les liens `bouffonsbios.wordpress.com` pointent vers `https://bouffonsbios.org`. Les images hébergées chez WordPress restent en **hotlink** `*.files.wordpress.com` tant qu’elles y sont servies.

### Catégories (sans réimporter le WXR)

Les catégories sont dans le front matter (`category:`). Pour recalculer à partir des slugs de fichiers :

```sh
npm run assign:categories
```

## Dépôt

<https://github.com/tmosmant/bouffonsbios>
