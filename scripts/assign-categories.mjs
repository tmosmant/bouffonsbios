/**
 * Ajoute / met à jour `category:` dans le front matter selon le slug de fichier.
 * Usage : node scripts/assign-categories.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '../src/content/articles');

/** @param {string} basename */
function categoryForFile(basename) {
	const s = basename.replace(/\.md$/, '');
	if (s.startsWith('affiche-')) return 'Affiches';
	if (s.startsWith('affiches')) return 'Affiches';
	if (s.includes('communique')) return 'Communiqués de presse';
	if (s.includes('vignerons')) return 'Nos vignerons';
	return 'Le Bio';
}

for (const name of readdirSync(DIR)) {
	if (!name.endsWith('.md')) continue;
	const cat = categoryForFile(name);
	const p = join(DIR, name);
	const full = readFileSync(p, 'utf8');
	const m = full.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!m) {
		console.warn('Skip (no front matter):', name);
		continue;
	}
	let [, fm, body] = m;
	const lines = fm.split('\n').filter((l) => !/^category:\s*/.test(l));
	const idx = lines.findIndex((l) => l.startsWith('date:'));
	if (idx !== -1) lines.splice(idx + 1, 0, `category: ${cat}`);
	else lines.push(`category: ${cat}`);
	writeFileSync(p, `---\n${lines.join('\n')}\n---\n${body}`, 'utf8');
}

console.log('Catégories assignées dans', DIR);
