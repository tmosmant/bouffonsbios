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

L’export **Outils → Exporter** (fichier `.xml`) est compatible : champs `title`, `wp:post_date_gmt` / `wp:post_date`, `excerpt:encoded`, `content:encoded` → front matter + corps Markdown.

```sh
npm run import:wp -- /chemin/vers/export.xml
```

Sans argument, le script cherche par défaut `~/Downloads/bouffonsbios.WordPress.YYYY-MM-DD.xml`. Il **remplace** tous les `.md` du dossier `articles` (billets `post` publiés uniquement ; pas les pages type Accueil / Contact, ni les commentaires). Les blocs Gutenberg (`<!-- wp:… -->`) sont retirés ; les liens `bouffonsbios.wordpress.com` pointent vers `https://bouffonsbios.org`. Les images hébergées chez WordPress restent en **hotlink** `*.files.wordpress.com` tant qu’elles y sont servies.

## Dépôt

<https://github.com/tmosmant/bouffonsbios>
