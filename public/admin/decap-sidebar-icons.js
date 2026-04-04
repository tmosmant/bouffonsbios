/**
 * Remplace l’icône « crayon » par une icône adaptée à chaque collection (sidebar Decap).
 * Le DOM est géré par React : MutationObserver + re-patch si le nœud est recréé.
 */
(function () {
	const NAMES = new Set(['site', 'articles']);

	const SVGS = {
		site:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="14" y2="15"/></svg>',
		articles:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
	};

	function collectionFromHref(href) {
		if (!href || typeof href !== 'string') return null;
		const normalized = href.replace(/^#/, '');
		const parts = normalized.split('/').filter(Boolean);
		const i = parts.indexOf('collections');
		if (i === -1) return null;
		const name = parts[i + 1];
		if (!name || !NAMES.has(name)) return null;
		if (parts[i + 2] === 'entries' || parts[i + 2] === 'new') return null;
		return name;
	}

	function patchLink(a) {
		const col = collectionFromHref(a.getAttribute('href') || '');
		if (!col) return;
		const svg = a.querySelector(':scope > svg') || a.querySelector('svg');
		if (!svg) return;
		if (svg.getAttribute('data-bb-col') === col) return;
		svg.setAttribute('data-bb-col', col);
		svg.innerHTML = '';
		const tpl = document.createElement('template');
		tpl.innerHTML = SVGS[col].trim();
		const node = tpl.content.firstElementChild;
		if (!node) return;
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		while (node.firstChild) svg.appendChild(node.firstChild);
		for (const attr of ['xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) {
			const v = node.getAttribute(attr);
			if (v != null) svg.setAttribute(attr, v);
		}
	}

	let scheduled = false;
	function schedulePatch() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			const root = document.getElementById('nc-root');
			if (!root) return;
			root.querySelectorAll('a[href*="collections/"]').forEach(patchLink);
		});
	}

	const mo = new MutationObserver(schedulePatch);
	mo.observe(document.documentElement, { childList: true, subtree: true });
	schedulePatch();
})();
