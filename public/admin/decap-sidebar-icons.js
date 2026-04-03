/**
 * Remplace l’icône « crayon » par une icône adaptée à chaque collection (sidebar Decap).
 * Le DOM est géré par React : MutationObserver + re-patch si le nœud est recréé.
 */
(function () {
	const NAMES = new Set(['articles', 'contact', 'manifeste', 'presse']);

	const SVGS = {
		articles:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
		contact:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
		manifeste:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
		presse:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9h2v9z"/><path d="M18 4h2v11h-2"/><path d="M10 4h4"/><path d="M10 8h4"/><path d="M10 12h4"/></svg>',
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
