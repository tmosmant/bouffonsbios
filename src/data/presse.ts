/**
 * Reprises presse & sites tiers (événementiel, vin, locale) — à mettre à jour au fil des années.
 * Liens vérifiés via recherche web (2026).
 */
export type PresseItem = {
	/** Nom du média ou du site */
	source: string;
	/** Titre ou accroche affiché */
	title: string;
	href: string;
};

export const PRESSE_ITEMS: PresseItem[] = [
	{
		source: 'Le Parisien',
		title: 'Les vins bio à la halle de la Croix de Chavaux (Montreuil)',
		href: 'https://www.leparisien.fr/seine-saint-denis-93/vivreen-seine-saint-denis-17-03-2012-1909575.php',
	},
	{
		source: 'France Région',
		title: 'Le marché des vins bio de Montreuil',
		href: 'https://www.franceregion.fr/les-amateurs-de-vins-affluent-a-montreuil-art742',
	},
	{
		source: 'Paperblog',
		title: '13ᵉ salon des vins bio de Montreuil — organisé par Bouffons Bio',
		href: 'https://www.paperblog.fr/7506850/sauvons-le-climat-buvons-bio-21-mars-2015-13eme-salon-des-vins-bio-de-montreuil-organise-par-bouffons-bio/',
	},
	{
		source: 'Paris-Bistro',
		title: '21ᵉ marché des vins bio — samedi 9 mai 2026 à Montreuil',
		href: 'https://www.paris-bistro.com/event/21eme-marche-des-vins-bio-samedi-9-mai-2026-a-montreuil',
	},
	{
		source: 'Vitisphere',
		title: 'Marché aux vins bio de Montreuil (agenda)',
		href: 'https://www.vitisphere.com/agenda-62757-marche-aux-vins-bio-de-montreuil.html',
	},
	{
		source: 'Au cœur du CHR',
		title: 'Marché des vins bio à Montreuil',
		href: 'https://aucoeurduchr.fr/decision-business/marche-des-vins-bio-a-montreuil/',
	},
];
