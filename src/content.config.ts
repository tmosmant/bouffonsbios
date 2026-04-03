import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
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

export const collections = { articles };
