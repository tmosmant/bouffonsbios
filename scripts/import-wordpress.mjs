/**
 * Importe les billets WordPress (WXR) vers src/content/articles/*.md
 *
 * - Développe les shortcodes [gallery ids="…"] grâce aux pièces jointes (wp:post_type=attachment) du même export.
 * - Optionnel : télécharge les images WordPress vers public/uploads/wp-import/ et réécrit les liens en /uploads/…
 *
 * Usage:
 *   node scripts/import-wordpress.mjs [export.xml]
 *   node scripts/import-wordpress.mjs [export.xml] --skip-download
 */
import {
	readFileSync,
	writeFileSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
	existsSync,
} from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'src/content/articles');
const UPLOADS_DIR = join(ROOT, 'public/uploads/wp-import');
const DEFAULT_XML = join(process.env.HOME, 'Downloads/bouffonsbios.WordPress.2026-04-03.xml');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SKIP_DOWNLOAD = process.argv.includes('--skip-download');
const xmlPath = args[0] || DEFAULT_XML;

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

/**
 * Pièces jointes du WXR : wp:post_id → URL fichier (pour [gallery ids="…"]).
 * @param {unknown[]} items
 * @returns {Map<string, string>}
 */
function collectAttachmentsById(items) {
	/** @type {Map<string, string>} */
	const map = new Map();
	for (const item of items) {
		if (str(item['wp:post_type']) !== 'attachment') continue;
		const id = str(item['wp:post_id']).trim();
		if (!id) continue;
		let url = str(item['wp:attachment_url']).trim();
		if (!url) url = str(item.guid).trim();
		if (!url) url = str(item.link).trim();
		url = rewriteUrls(url);
		if (url && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url)) {
			map.set(id, url);
		}
	}
	return map;
}

/**
 * Remplace [gallery … ids="1,2,3" …] par des <img> (avant Turndown).
 * @param {string} html
 * @param {Map<string, string>} attachmentById
 */
function expandGalleryShortcodes(html, attachmentById) {
	return html.replace(/\[gallery\b[^\]]*ids=["']([^"']+)["'][^\]]*\]/gi, (_, idsRaw) => {
		const ids = idsRaw.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
		const blocks = [];
		const missing = [];
		for (const id of ids) {
			const url = attachmentById.get(id);
			if (url) {
				const safe = url.replace(/"/g, '&quot;');
				blocks.push(`<p><img src="${safe}" alt="Affiche" /></p>`);
			} else {
				missing.push(id);
			}
		}
		if (missing.length) {
			console.warn(`  [gallery] IDs sans fichier dans l’export : ${missing.join(', ')}`);
		}
		if (!blocks.length) {
			return '<p><em>(Galerie : aucune image trouvée dans l’export WXR pour ces IDs.)</em></p>';
		}
		return `\n${blocks.join('\n')}\n`;
	});
}

function htmlToMarkdown(html, attachmentById) {
	let cleaned = expandGalleryShortcodes(html, attachmentById);
	cleaned = rewriteUrls(stripWpBlocks(cleaned.trim()));
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

const WP_IMG_MD_RE =
	/!\[([^\]]*)\]\((https:\/\/bouffonsbios\.(?:files\.wordpress\.com[^)\s]+|wordpress\.com\/wp-content\/uploads[^)\s]+))\)/gi;

function stripQueryForFetch(url) {
	try {
		const u = new URL(url);
		u.search = '';
		return u.href;
	} catch {
		return url.split('?')[0];
	}
}

function extFromContentType(contentType) {
	if (!contentType) return '';
	if (contentType.includes('png')) return '.png';
	if (contentType.includes('gif')) return '.gif';
	if (contentType.includes('webp')) return '.webp';
	if (contentType.includes('svg')) return '.svg';
	if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
	return '';
}

/**
 * Télécharge les médias référencés dans le markdown et remplace par /uploads/wp-import/…
 * @param {string} md
 * @returns {Promise<string>}
 */
async function localizeWordPressImages(md) {
	/** @type {Set<string>} */
	const urls = new Set();
	let m;
	const scan = new RegExp(WP_IMG_MD_RE.source, 'gi');
	while ((m = scan.exec(md)) !== null) {
		urls.add(m[2]);
	}
	if (urls.size === 0) return md;

	mkdirSync(UPLOADS_DIR, { recursive: true });
	const usedNames = new Set(existsSync(UPLOADS_DIR) ? readdirSync(UPLOADS_DIR) : []);

	/** @type {Map<string, string>} */
	const remoteToPublic = new Map();

	for (const remoteUrl of urls) {
		const fetchUrl = stripQueryForFetch(remoteUrl);
		try {
			const res = await fetch(fetchUrl, {
				redirect: 'follow',
				headers: { 'User-Agent': 'bouffonsbios-wp-import/1.0' },
			});
			if (!res.ok) {
				console.warn(`  Téléchargement ${res.status} : ${fetchUrl}`);
				continue;
			}
			const buf = Buffer.from(await res.arrayBuffer());
			const ct = res.headers.get('content-type') || '';

			let pathPart = '';
			try {
				pathPart = decodeURIComponent(new URL(fetchUrl).pathname);
			} catch {
				pathPart = '';
			}
			let base = basename(pathPart) || '';
			base = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '');
			if (!base || base === '-') {
				base = `img-${createHash('sha256').update(fetchUrl).digest('hex').slice(0, 12)}`;
			}
			if (!/\.[a-z0-9]{2,4}$/i.test(base)) {
				base += extFromContentType(ct) || '.jpg';
			}

			let localName = base;
			let n = 0;
			while (usedNames.has(localName)) {
				n += 1;
				const dot = base.lastIndexOf('.');
				const stem = dot > 0 ? base.slice(0, dot) : base;
				const ext = dot > 0 ? base.slice(dot) : '';
				localName = `${stem}-${n}${ext}`;
			}

			writeFileSync(join(UPLOADS_DIR, localName), buf);
			usedNames.add(localName);
			const publicPath = `/uploads/wp-import/${localName}`;
			remoteToPublic.set(remoteUrl, publicPath);
			console.log(`  → ${publicPath}`);
		} catch (e) {
			console.warn(`  Erreur ${fetchUrl}:`, /** @type {Error} */ (e).message);
		}
	}

	let out = md;
	const pairs = [...remoteToPublic.entries()].sort((a, b) => b[0].length - a[0].length);
	for (const [remote, pub] of pairs) {
		out = out.split(remote).join(pub);
	}
	return out;
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

const attachmentById = collectAttachmentsById(items);
console.log(`Pièces jointes indexées : ${attachmentById.size}`);

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
	const body = htmlToMarkdown(contentHtml, attachmentById);
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

if (!SKIP_DOWNLOAD) {
	console.log('Téléchargement des images vers public/uploads/wp-import/ …');
	for (const p of posts) {
		const before = p.body;
		p.body = await localizeWordPressImages(p.body);
		if (p.body !== before) {
			console.log(`  (${p.slug})`);
		}
	}
} else {
	console.log('(--skip-download : URLs WordPress conservées dans le markdown)');
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
