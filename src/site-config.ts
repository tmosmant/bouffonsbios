/** Libellé court pour le lien d’accueil (équivalent de l’entrée “à la une” du menu WordPress). */
export const NAV_HIGHLIGHT = {
	label: '21ᵉ marché des vins bio 2026',
	href: '/#marche',
} as const;

/** Catégories (identiques au site WordPress). */
export const ARTICLE_CATEGORIES = [
	'Affiches',
	'Communiqués de presse',
	'Non classé',
	'Vignerons',
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** Segment d’URL pour les pages de liste filtrée. */
export const CATEGORY_SLUGS: Record<ArticleCategory, string> = {
	Affiches: 'affiches',
	'Communiqués de presse': 'communiques',
	'Non classé': 'non-classe',
	Vignerons: 'vignerons',
};

export function categoryFromSlug(slug: string): ArticleCategory | undefined {
	const entry = Object.entries(CATEGORY_SLUGS).find(([, s]) => s === slug);
	return entry ? (entry[0] as ArticleCategory) : undefined;
}
