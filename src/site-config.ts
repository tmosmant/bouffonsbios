/** Catégories affichées (Decap + site). */
export const ARTICLE_CATEGORIES = [
	'Affiches',
	'Communiqués de presse',
	'Le Bio',
	'Nos vignerons',
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** Segment d’URL pour les pages de liste filtrée. */
export const CATEGORY_SLUGS: Record<ArticleCategory, string> = {
	Affiches: 'affiches',
	'Communiqués de presse': 'communiques',
	'Le Bio': 'le-bio',
	'Nos vignerons': 'nos-vignerons',
};

export function categoryFromSlug(slug: string): ArticleCategory | undefined {
	const entry = Object.entries(CATEGORY_SLUGS).find(([, s]) => s === slug);
	return entry ? (entry[0] as ArticleCategory) : undefined;
}
