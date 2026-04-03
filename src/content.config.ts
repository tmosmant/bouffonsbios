import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const categoryEnum = z.enum([
	'Affiches',
	'Communiqués de presse',
	'Non classé',
	'Vignerons',
]);

const articles = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
	schema: z.object({
		slug: z.string().optional(),
		title: z.string(),
		date: z.coerce.date(),
		category: categoryEnum.default('Non classé'),
		excerpt: z.string().optional(),
	}),
});

const manifeste = defineCollection({
	loader: file('src/content/manifeste.json'),
	schema: z.object({
		metaTitle: z.string(),
		metaDescription: z.string(),
		eyebrow: z.string(),
		heading: z.string(),
		subtitle: z.string(),
		bodyMarkdown: z.string(),
		signature: z.string(),
	}),
});

const contact = defineCollection({
	loader: file('src/content/contact.json'),
	schema: z.object({
		metaTitle: z.string(),
		metaDescription: z.string(),
		eyebrow: z.string(),
		heading: z.string(),
		leadMarkdown: z.string(),
		email: z.string(),
		emailCardLabel: z.string(),
		emailHint: z.string(),
		phoneTel: z.string(),
		phoneCardLabel: z.string(),
		phoneContactName: z.string(),
		phoneHint: z.string(),
		asideTitle: z.string(),
		asideLinks: z
			.array(
				z.object({
					label: z.string(),
					href: z.string(),
					description: z.string(),
				}),
			)
			.default([]),
		footnote: z.string().optional().default(''),
	}),
});

export const collections = { articles, contact, manifeste };
