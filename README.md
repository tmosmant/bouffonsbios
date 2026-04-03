# Bouffons Bios

Site [Astro](https://astro.build) + [Decap CMS](https://decapcms.org), déployé sur **Cloudflare Workers** (assets statiques + worker Astro).

## URLs

| Ressource | URL |
|-----------|-----|
| Site (prod) | <https://bouffonsbio.org> · <https://www.bouffonsbio.org> |
| Alias Workers | <https://bouffonsbio.thomas-mosmant.workers.dev> |
| Admin Decap | <https://bouffonsbio.org/admin/> |
| OAuth GitHub (proxy) | <https://bouffonsbio-oauth.thomas-mosmant.workers.dev> |

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
   - **Homepage URL** : `https://bouffonsbio.org`  
   - **Authorization callback URL** :  
     `https://bouffonsbio-oauth.thomas-mosmant.workers.dev/callback?provider=github`

2. **Cloudflare** — sur le worker `bouffonsbio-oauth` :

   ```sh
   npx wrangler secret put GITHUB_OAUTH_SECRET -c workers/decap-oauth/wrangler.jsonc
   npx wrangler vars put GITHUB_OAUTH_ID -c workers/decap-oauth/wrangler.jsonc
   ```

   Colle le **Client ID** pour la variable, le **Client secret** pour le secret.

3. Redéploie le site après modification de `public/admin/config.yml` : `npm run deploy`.

Tant que l’étape 2 n’est pas faite, `/auth` sur le worker OAuth répond **503** avec un message explicite.

## Contenu

- Articles : `src/content/articles/` (Markdown + front matter)
- Médias Decap : `public/uploads/`

Schéma Astro : `src/content.config.ts` — après gros changements : `npx astro sync`.

## Dépôt

<https://github.com/tmosmant/bouffonsbio>
