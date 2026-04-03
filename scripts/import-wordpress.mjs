/**
 * Importe les billets WordPress (WXR) vers src/content/articles/*.md
 * Usage: node scripts/import-wordpress.mjs [chemin/vers/export.xml]
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'src/content/articles');
const DEFAULT_XML = join(process.env.HOME, 'Downloads/bouffonsbios.WordPress.2026-04-03.xml');

const xmlPath = process.argv[2] || DEFAULT_XML;

/** nicename WordPress (taxonomie category) → libellé Astro / Decap */
const NICENAME_TO_CATEGORY = {
	affiches: 'Affiches',
	'communiques-de-presse': 'Communiqués de presse',
	'non-classe': 'Non classé',
	vignerons: 'Vignerons',
};

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '-',
});

/** @param {unknown} v */
function str(v) {
	if (v == null) return '';
	if (typeof v === 'string') return v;
	if (typeof v === 'object' && v !== null && '#text' in v) return String(/** @type {{'#text': string}} */ (v)['#text']);
	return String(v);
}

function stripWpBlocks(html) {
	return html.replace(/<!--\s*wp:[\s\S]*?-->/g, '');
}

function rewriteUrls(html) {
	return html
		.replace(
			/https?:\/\/bouffonsbios\.wordpress\.com\/wp-content\/uploads\//g,
			'https://bouffonsbios.files.wordpress.com/',
		)
		.replace(/https?:\/\/bouffonsbios\.wordpress\.com/g, 'https://bouffonsbios.org')
		.replace(/http:\/\/bouffonsbios\.files\.wordpress\.com/g, 'https://bouffonsbios.files.wordpress.com');
}

function slugify(input) {
	const base = input
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return base || 'article';
}

function parseDateGmt(gmt, local) {
	const g = str(gmt).trim();
	if (!g || g.startsWith('0000-00-00')) {
		const l = str(local).trim();
		const m = l.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (m) return `${m[1]}-${m[2]}-${m[3]}`;
		return '1970-01-01';
	}
	const m = g.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;
	return '1970-01-01';
}

function htmlToMarkdown(html) {
	const cleaned = rewriteUrls(stripWpBlocks(html.trim()));
	if (!cleaned) return '';
	let md = turndown.turndown(cleaned).trim();
	md = md.replace(/\n{3,}/g, '\n\n');
	return md;
}

function plainExcerpt(html) {
	if (!html) return '';
	const t = rewriteUrls(stripWpBlocks(html))
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

/** @param {unknown} item */
function categoryFromWpItem(item) {
	const c = item?.category;
	if (!c) return 'Non classé';
	const arr = Array.isArray(c) ? c : [c];
	for (const el of arr) {
		if (typeof el !== 'object' || el === null) continue;
		const dom = /** @type {Record<string, string>} */ (el)['@_domain'];
		if (dom !== 'category') continue;
		const nice = /** @type {Record<string, string>} */ (el)['@_nicename'];
		if (nice && NICENAME_TO_CATEGORY[nice]) return NICENAME_TO_CATEGORY[nice];
	}
	return 'Non classé';
}

const xml = readFileSync(xmlPath, 'utf8');
const parser = new XMLParser({
	ignoreAttributes: false,
	trimValues: false,
	processEntities: true,
});
const data = parser.parse(xml);
const rawItems = data?.rss?.channel?.item;
const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

/** @type {{ slug: string; title: string; date: string; category: string; excerpt?: string; body: string }[]} */
const posts = [];

for (const item of items) {
	const type = str(item['wp:post_type']);
	const status = str(item['wp:status']);
	if (type !== 'post' || status !== 'publish') continue;

	let slug = str(item['wp:post_name']).trim();
	const title = str(item.title).trim() || 'Sans titre';
	if (!slug) {
		slug = slugify(title);
		const id = str(item['wp:post_id']);
		if (id) slug = `${slug}-${id}`;
	}

	const date = parseDateGmt(item['wp:post_date_gmt'], item['wp:post_date']);
	const excerptHtml = str(item['excerpt:encoded']);
	const contentHtml = str(item['content:encoded']);
	const excerpt = plainExcerpt(excerptHtml) || undefined;
	const body = htmlToMarkdown(contentHtml);
	const category = categoryFromWpItem(item);

	posts.push({ slug, title, date, category, excerpt, body });
}

/** @param {string} s */
function uniqueSlug(s, used) {
	let out = slugify(s);
	let n = 0;
	while (used.has(out)) {
		n += 1;
		out = `${slugify(s)}-${n}`;
	}
	used.add(out);
	return out;
}

const used = new Set();
for (const p of posts) {
	p.slug = uniqueSlug(p.slug, used);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) {
	if (f.endsWith('.md')) unlinkSync(join(OUT_DIR, f));
}

for (const p of posts) {
	const excerptLine = p.excerpt ? `excerpt: >-\n  ${p.excerpt.replace(/\n/g, ' ')}\n` : '';
	const fm = `---
slug: ${p.slug}
title: ${yamlString(p.title)}
date: ${p.date}
category: ${yamlString(p.category)}
${excerptLine}---

${p.body || '_Contenu vide._'}
`;
	writeFileSync(join(OUT_DIR, `${p.slug}.md`), fm, 'utf8');
}

function yamlString(s) {
	if (/[:#\n"|']/.test(s)) return JSON.stringify(s);
	return s;
}

console.log(`Importé ${posts.length} articles depuis ${xmlPath} → ${OUT_DIR}`);
