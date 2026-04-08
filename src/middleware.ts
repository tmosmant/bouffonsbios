import { defineMiddleware } from 'astro:middleware';

/** Anciennes URLs (catégories renommées, article affiches fusionné → une page par affiche). */
const LEGACY_REDIRECTS: Record<string, string> = {
	'/articles/categorie/non-classe': '/articles/categorie/le-bio/',
	'/articles/categorie/non-classe/': '/articles/categorie/le-bio/',
	'/articles/categorie/vignerons': '/articles/categorie/nos-vignerons/',
	'/articles/categorie/vignerons/': '/articles/categorie/nos-vignerons/',
	'/articles/affiches-2003-2020': '/articles/categorie/affiches/',
	'/articles/affiches-2003-2020/': '/articles/categorie/affiches/',
};

export const onRequest = defineMiddleware((context, next) => {
	const path = context.url.pathname;
	const target = LEGACY_REDIRECTS[path];
	if (target) {
		return context.redirect(target, 301);
	}
	return next();
});
