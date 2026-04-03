# Bouffons Bios

Site statique [Astro](https://astro.build) + [Decap CMS](https://decapcms.org), déployable sur [Cloudflare Pages](https://pages.cloudflare.com).

## Développement

```sh
npm install
npm run dev
```

- Site : <http://localhost:4321>
- Admin Decap : <http://localhost:4321/admin/> (avec `local_backend: true` dans `public/admin/config.yml`, les brouillons restent en local)

Build :

```sh
npm run build
```

Prévisualisation Cloudflare en local :

```sh
npx wrangler pages dev ./dist
```

## Contenu

- Articles Markdown : `src/content/articles/`
- Images uploadées via Decap : `public/uploads/`

Après modification du schéma ou des dossiers, régénère les types si besoin : `npm run astro sync`.

## Déploiement Cloudflare Pages

1. Projet GitHub connecté à Cloudflare Pages.
2. Build command : `npm run build`
3. Build output directory : `dist`
4. Variables d’environnement : aucune obligatoire pour ce squelette.

## Decap CMS en production (GitHub)

Sans Netlify, il faut une **application OAuth GitHub** et un **point de terminaison** qui échange le code contre un token (Decap ne peut pas le faire entièrement côté navigateur seul).

À faire une fois :

1. GitHub → Settings → Developer settings → OAuth Apps : créer une app, callback URL = l’URL indiquée par ton proxy OAuth (souvent une Cloudflare Worker / fonction dédiée).
2. Retirer `local_backend: true` de `public/admin/config.yml` pour la prod (ou le surcharger via build si tu préfères deux configs).
3. Suivre la doc Decap [GitHub backend](https://decapcms.org/docs/github-backend/) et un guide type *GitHub OAuth pour Decap sur Cloudflare* (Worker communautaire ou équivalent).

Tant que l’OAuth n’est pas en place, les éditeurs peuvent éditer les fichiers Markdown directement dans le dépôt ou via l’admin en local uniquement.

## Licence

Contenu et code : selon ce que vous choisissez pour l’association.
