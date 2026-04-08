/**
 * Aperçus Decap : la page contact (fichier JSON + objet) n’a pas de template par défaut ;
 * les articles bénéficient d’un rendu titre + corps markdown cohérent.
 */
(function () {
	if (typeof CMS === 'undefined' || typeof createClass === 'undefined' || typeof h === 'undefined') {
		return;
	}

	CMS.registerPreviewStyle('/admin/decap-preview.css');

	function dcpEscapeHtml(t) {
		return String(t == null ? '' : t)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/** Aperçu uniquement : *em* et **gras** sur texte échappé */
	function dcpInlineFormat(s) {
		return dcpEscapeHtml(s)
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	}

	/** Liens [libellé](url) pour la ligne organisateur */
	function dcpLinkFormat(s) {
		return dcpEscapeHtml(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
	}

	/** Paragraphes + retours ligne + *em* / **gras** (comme marked breaks sur le programme) */
	function dcpProgramHtml(md) {
		var raw = String(md == null ? '' : md).trim();
		if (!raw) return '';
		var paras = raw.split(/\n\n+/);
		var out = [];
		for (var i = 0; i < paras.length; i++) {
			var p = paras[i].trim();
			if (!p) continue;
			var line = dcpEscapeHtml(p).replace(/\n/g, '<br>');
			line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
			line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
			out.push('<p>' + line + '</p>');
		}
		return out.join('');
	}

	/** Corps manifeste / longs textes : paragraphes + liens [x](url) + emphases */
	function dcpRichMarkdownParagraphs(md) {
		var raw = String(md == null ? '' : md).trim();
		if (!raw) return '';
		var paras = raw.split(/\n\n+/);
		var out = [];
		for (var i = 0; i < paras.length; i++) {
			var block = paras[i].trim();
			if (!block) continue;
			var line = dcpEscapeHtml(block).replace(/\n/g, '<br>');
			line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
			line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
			line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
			out.push('<p>' + line + '</p>');
		}
		return out.join('');
	}

	/** Badges RATP statiques (même lignes que TransitBadges.astro) pour la ligne « Accès » */
	var DCP_TRANSIT_PREVIEW_HTML =
		'<div class="dcp-transit">' +
		'<div class="dcp-transit-row" role="group" aria-label="Métro">' +
		'<span class="dcp-transit-badge dcp-transit-badge--metro" style="--tbg:#cec92a;--tfg:#25303b" title="Métro ligne 9">' +
		'<span class="dcp-transit-m" aria-hidden="true">M</span><span class="dcp-transit-num">9</span></span>' +
		'<span class="dcp-transit-station">Croix de Chavaux</span></div>' +
		'<div class="dcp-transit-row dcp-transit-row--bus" role="group" aria-label="Bus">' +
		'<span class="dcp-transit-mode-label" aria-hidden="true">Bus</span>' +
		'<span class="dcp-transit-badge dcp-transit-badge--bus" style="--tbg:#FFCE00;--tfg:#25303b" title="Bus ligne 102">102</span>' +
		'<span class="dcp-transit-badge dcp-transit-badge--bus" style="--tbg:#00814F;--tfg:#ffffff" title="Bus ligne 115">115</span>' +
		'<span class="dcp-transit-badge dcp-transit-badge--bus" style="--tbg:#CEADD2;--tfg:#25303b" title="Bus ligne 122">122</span>' +
		'<span class="dcp-transit-badge dcp-transit-badge--bus" style="--tbg:#F28E42;--tfg:#25303b" title="Bus ligne 127">127</span>' +
		'<span class="dcp-transit-badge dcp-transit-badge--bus" style="--tbg:#662483;--tfg:#ffffff" title="Bus ligne 202">202</span>' +
		'</div></div>';

	/** Même règle que sur le site : ligne 2 collée si elle commence par — / – / «- » */
	function dcpInfoLine2SameRow(line2) {
		if (line2 == null || !String(line2).trim()) return false;
		var s = String(line2).trimStart();
		var c = s.codePointAt(0);
		return c === 0x2014 || c === 0x2013 || /^-\s/.test(s);
	}

	var dcpContactEmailIcon = h(
		'svg',
		{ width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
		h('path', {
			d: 'M4 6h16v12H4V6z',
			stroke: 'currentColor',
			strokeWidth: 1.75,
			strokeLinejoin: 'round',
			fill: 'none',
		}),
		h('path', {
			d: 'M4 7l8 6 8-6',
			stroke: 'currentColor',
			strokeWidth: 1.75,
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			fill: 'none',
		}),
	);

	var dcpContactTelIcon = h(
		'svg',
		{ width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
		h('path', {
			d: 'M6.5 4h3l1.5 4.5-2 1.5c1.2 2.4 3.1 4.3 5.5 5.5l1.5-2L20 15v3a1.5 1.5 0 01-1.3 1.5c-3.8.5-12-7.2-11.5-11A1.5 1.5 0 016.5 4z',
			stroke: 'currentColor',
			strokeWidth: 1.75,
			strokeLinejoin: 'round',
			fill: 'none',
		}),
	);

	var ContactPreview = createClass({
		render: function () {
			var entry = this.props.entry;
			var p = entry.getIn(['data', 'page']);
			if (!p || p.size === 0) {
				return h('div', { className: 'decap-contact-preview' }, h('p', { className: 'dcp-empty' }, 'Remplissez le bloc « Contenu de la page » pour voir l’aperçu.'));
			}

			var widgets = this.props.widgetsFor('page');
			var leadPreview = widgets && widgets.getIn ? widgets.getIn(['widgets', 'leadMarkdown']) : null;

			var email = p.get('email') || '';
			var tel = (p.get('phoneTel') || '').replace(/\s/g, '');
			var phoneHint = p.get('phoneHint') || '';
			var phoneHintNbsp = phoneHint.replace(/ /g, '\u00a0');

			var leadFallbackHtml = dcpProgramHtml(p.get('leadMarkdown') || '');
			var leadBlock = leadPreview
				? h('div', { className: 'dcp-contact-lead' }, leadPreview)
				: h('div', {
						className: 'dcp-contact-lead',
						dangerouslySetInnerHTML: { __html: leadFallbackHtml },
					});

			var links = p.get('asideLinks');
			var linkItems = [];
			if (links && links.size) {
				links.forEach(function (item, i) {
					linkItems.push(
						h(
							'li',
							{ key: i },
							h('a', { href: item.get('href') || '#' }, item.get('label') || ''),
							h('span', { className: 'dcp-contact-links-desc' }, item.get('description') || ''),
						),
					);
				});
			}

			var foot = p.get('footnote');
			var footStr = foot != null && String(foot).trim() ? String(foot).trim() : '';

			return h(
				'div',
				{ className: 'decap-contact-preview' },
				h(
					'article',
					{ className: 'dcp-contact-article' },
					h(
						'header',
						{ className: 'dcp-contact-hero' },
						h('p', { className: 'dcp-contact-eyebrow', 'aria-hidden': true }, p.get('eyebrow') || ''),
						h('h1', {}, p.get('heading') || 'Contact'),
						leadBlock,
					),
					h(
						'div',
						{ className: 'dcp-contact-cards', role: 'list' },
						h(
							'a',
							{
								className: 'dcp-contact-card',
								href: email ? 'mailto:' + email : '#',
								role: 'listitem',
							},
							h('span', { className: 'dcp-contact-card-icon', 'aria-hidden': true }, dcpContactEmailIcon),
							h('span', { className: 'dcp-contact-card-label' }, p.get('emailCardLabel') || 'E-mail'),
							h('span', { className: 'dcp-contact-card-value' }, email),
							h('span', { className: 'dcp-contact-card-hint' }, p.get('emailHint') || ''),
						),
						h(
							'a',
							{
								className: 'dcp-contact-card dcp-contact-card--tel',
								href: tel ? 'tel:' + tel : '#',
								role: 'listitem',
							},
							h(
								'span',
								{ className: 'dcp-contact-card-icon dcp-contact-card-icon--tel', 'aria-hidden': true },
								dcpContactTelIcon,
							),
							h('span', { className: 'dcp-contact-card-label' }, p.get('phoneCardLabel') || 'Téléphone'),
							h('span', { className: 'dcp-contact-card-value' }, p.get('phoneContactName') || ''),
							h('span', { className: 'dcp-contact-card-hint' }, phoneHintNbsp),
						),
					),
					linkItems.length
						? h(
								'section',
								{
									className: 'dcp-contact-aside',
									'aria-labelledby': 'dcp-contact-liens',
								},
								h('h2', { id: 'dcp-contact-liens' }, p.get('asideTitle') || 'À voir aussi'),
								h('ul', { className: 'dcp-contact-links' }, linkItems),
							)
						: null,
					footStr ? h('p', { className: 'dcp-contact-note' }, footStr) : null,
				),
			);
		},
	});

	var dcpManifesteVineSvg = h(
		'svg',
		{
			className: 'dcp-manifeste-deco-vine',
			viewBox: '0 0 120 160',
			fill: 'none',
			xmlns: 'http://www.w3.org/2000/svg',
		},
		h('path', {
			d: 'M60 8c-8 18-22 32-28 52-4 14-2 30 8 42 6 8 16 14 26 14 12 0 22-8 28-18 10-18 8-40-4-56-8-10-20-16-30-34z',
			stroke: 'currentColor',
			strokeWidth: 1.25,
			strokeLinejoin: 'round',
			opacity: 0.35,
		}),
		h('path', {
			d: 'M60 116v36M44 132c10-6 22-6 32 0M52 100c-14 4-24 16-28 30M76 98c14 6 24 18 28 32',
			stroke: 'currentColor',
			strokeWidth: 1.15,
			strokeLinecap: 'round',
			opacity: 0.4,
		}),
	);

	var ManifestePreview = createClass({
		render: function () {
			var entry = this.props.entry;
			var p = entry.getIn(['data', 'page']);
			if (!p || p.size === 0) {
				return h(
					'div',
					{ className: 'decap-manifeste-preview' },
					h('p', { className: 'dcp-empty' }, 'Remplissez le bloc « Contenu de la page » pour voir l’aperçu.'),
				);
			}
			var widgets = this.props.widgetsFor('page');
			var bodyPreview = widgets && widgets.getIn ? widgets.getIn(['widgets', 'bodyMarkdown']) : null;
			var bodyFallbackHtml = dcpRichMarkdownParagraphs(p.get('bodyMarkdown') || '');
			var bodyEl = bodyPreview
				? h('div', { className: 'dcp-manifeste-body dcp-manifeste-md' }, bodyPreview)
				: h('div', {
						className: 'dcp-manifeste-body dcp-manifeste-md',
						dangerouslySetInnerHTML: { __html: bodyFallbackHtml },
					});

			return h(
				'article',
				{ className: 'decap-manifeste-preview', lang: 'fr' },
				h(
					'div',
					{ className: 'dcp-manifeste-frame' },
					h(
						'div',
						{ className: 'dcp-manifeste-deco', 'aria-hidden': true },
						h('span', { className: 'dcp-manifeste-deco-quote' }, '«'),
						dcpManifesteVineSvg,
					),
					h(
						'header',
						{ className: 'dcp-manifeste-hero' },
						h('p', { className: 'dcp-manifeste-eyebrow' }, p.get('eyebrow') || ''),
						h('h1', { className: 'dcp-manifeste-title' }, p.get('heading') || 'Manifeste'),
						p.get('subtitle')
							? h('p', { className: 'dcp-manifeste-subtitle' }, p.get('subtitle'))
							: null,
					),
					h('div', { className: 'dcp-manifeste-accent-bar', 'aria-hidden': true }),
					bodyEl,
					h(
						'footer',
						{ className: 'dcp-manifeste-sign' },
						h(
							'div',
							{ className: 'dcp-manifeste-sign-inner' },
							h('p', {}, p.get('signature') || ''),
						),
					),
				),
			);
		},
	});

	var FlashPreview = createClass({
		render: function () {
			var entry = this.props.entry;
			var f = entry.getIn(['data', 'flash']);
			if (!f || f.size === 0) {
				return h(
					'div',
					{ className: 'decap-flash-preview' },
					h('p', { className: 'dcp-empty' }, 'Remplissez le bloc « Contenu » pour voir l’aperçu.'),
				);
			}
			var widgets = this.props.widgetsFor('flash');
			var bodyPreview = widgets && widgets.getIn ? widgets.getIn(['widgets', 'bodyMarkdown']) : null;
			var enabled = !!f.get('enabled');
			var allPages = !!f.get('showOnAllPages');
			var title = (f.get('title') || '').trim();
			var linkL = (f.get('linkLabel') || '').trim();
			var linkH = (f.get('linkHref') || '').trim();
			var hasLink = linkL && linkH;

			return h(
				'div',
				{ className: 'decap-flash-preview' },
				h(
					'p',
					{ className: 'dcp-flash-meta' },
					enabled ? h('span', { className: 'dcp-flash-on' }, 'Affiché sur le site') : h('span', { className: 'dcp-flash-off' }, 'Désactivé (invisible)'),
					' — ',
					allPages ? 'Toutes les pages' : 'Accueil seulement',
				),
				h(
					'aside',
					{ className: 'dcp-flash-box' },
					title ? h('h2', { className: 'dcp-flash-title' }, title) : null,
					h('div', { className: 'dcp-flash-body' }, bodyPreview || h('p', {}, f.get('bodyMarkdown') || '')),
					hasLink
						? h(
								'p',
								{ className: 'dcp-flash-cta' },
								h(
									'a',
									{ className: 'dcp-flash-link', href: linkH },
									linkL,
									' →',
								),
							)
						: null,
				),
			);
		},
	});

	function dcpPresseExternalHref(href) {
		return /^https?:\/\//i.test(String(href == null ? '' : href).trim());
	}

	var PressePreview = createClass({
		render: function () {
			var entry = this.props.entry;
			var b = entry.getIn(['data', 'block']);
			if (!b || b.size === 0) {
				return h(
					'div',
					{ className: 'decap-presse-preview' },
					h('p', { className: 'dcp-empty' }, 'Remplissez le bloc « Contenu » pour voir l’aperçu.'),
				);
			}
			var items = b.get('items');
			var lis = [];
			if (items && items.size) {
				items.forEach(function (it, i) {
					var href = (it.get('href') || '').trim() || '#';
					var aProps = { href: href };
					if (dcpPresseExternalHref(href)) {
						aProps.target = '_blank';
						aProps.rel = 'noopener noreferrer';
					}
					lis.push(
						h(
							'li',
							{ key: i },
							h(
								'a',
								aProps,
								h('span', { className: 'dcp-presse-source' }, it.get('source') || ''),
								h('span', { className: 'dcp-presse-title' }, it.get('title') || ''),
							),
						),
					);
				});
			}
			return h(
				'div',
				{ className: 'decap-presse-preview' },
				h(
					'p',
					{ className: 'dcp-presse-preview-note' },
					'Aperçu de l’encart tel qu’il apparaît dans la colonne droite de l’accueil (sans newsletter au-dessus).',
				),
				h(
					'aside',
					{
						className: 'dcp-presse-aside',
						'aria-labelledby': 'dcp-presse-title',
					},
					h('h2', { id: 'dcp-presse-title' }, b.get('heading') || ''),
					h('p', { className: 'dcp-presse-intro' }, b.get('intro') || ''),
					lis.length ? h('ul', { className: 'dcp-presse-list' }, lis) : null,
				),
			);
		},
	});

	var HomePreview = createClass({
		render: function () {
			var entry = this.props.entry;
			/* Données sous data.hero (objet JSON) ; repli si structure plate */
			var hero = entry.getIn(['data', 'hero']);
			if (!hero || hero.size === 0) {
				var root = entry.get('data');
				if (root && root.size && root.get('titleLine1') != null) {
					hero = root;
				}
			}
			if (!hero || hero.size === 0) {
				return h(
					'div',
					{ className: 'decap-home-preview' },
					h('p', { className: 'dcp-empty' }, 'Remplissez le bloc « Contenu » pour voir l’aperçu.'),
				);
			}

			var rows = hero.get('infoRows');
			var rowEls = [];
			if (rows && rows.size) {
				rows.forEach(function (row, i) {
					var term = row.get('term') || '';
					var l1 = row.get('line1') || '';
					var l2 = row.get('line2');
					var has2 = l2 != null && String(l2).trim() !== '';
					var sameLine = dcpInfoLine2SameRow(l2);
					var isAcces = String(term).trim() === 'Accès';
					var ddContent;
					if (isAcces) {
						ddContent = h('div', {
							dangerouslySetInnerHTML: { __html: DCP_TRANSIT_PREVIEW_HTML },
						});
					} else {
						ddContent = h(
							'span',
							{},
							l1,
							has2
								? sameLine
									? h(
											'span',
											{},
											'\u00a0',
											h('span', { className: 'dcp-hero-dd-muted' }, String(l2)),
										)
									: h(
											'span',
											{},
											h('br'),
											h('span', { className: 'dcp-hero-dd-muted' }, String(l2)),
										)
								: null,
						);
					}
					rowEls.push(
						h(
							'div',
							{ key: i },
							h('dt', {}, term),
							h('dd', {}, ddContent),
						),
					);
				});
			}

			var tagHtml = dcpInlineFormat(hero.get('taglineMarkdown') || '');
			var progHtml = dcpProgramHtml(hero.get('programMarkdown') || '');
			var legalHtml = dcpInlineFormat(hero.get('legalMarkdown') || '');
			var orgHtml = dcpLinkFormat(hero.get('orgMarkdown') || '');

			return h(
				'div',
				{ className: 'decap-home-preview' },
				h(
					'p',
					{ className: 'dcp-hero-preview-note' },
					'Aperçu du bloc héros (bannière + carte). Newsletter et encadré presse viennent d’autres fichiers sur le site.',
				),
				h(
					'section',
					{ className: 'dcp-hero', 'aria-labelledby': 'dcp-accueil-hero-title' },
					h(
						'div',
						{ className: 'dcp-hero-stack' },
						h(
							'figure',
							{ className: 'dcp-hero-banner' },
							h('img', {
								className: 'dcp-hero-banner-img',
								src: '/uploads/bandeau.jpg',
								alt: 'Bannière illustrée — ambiance marché de vins bio Bouffons Bios',
								width: 1696,
								height: 624,
								loading: 'lazy',
								decoding: 'async',
							}),
						),
						h(
							'div',
							{ className: 'dcp-hero-surface' },
							h(
								'div',
								{ className: 'dcp-hero-top' },
								h('span', { className: 'dcp-hero-badge' }, hero.get('badge') || ''),
								h('span', { className: 'dcp-hero-date', 'aria-hidden': true }, '·'),
								h('time', { className: 'dcp-hero-date', dateTime: hero.get('dateDatetime') || '' }, hero.get('dateLabel') || ''),
								h('span', { className: 'dcp-hero-hours' }, hero.get('hours') || ''),
							),
							h(
								'h1',
								{ id: 'dcp-accueil-hero-title', className: 'dcp-hero-display' },
								h('span', { className: 'dcp-hero-display-line' }, hero.get('titleLine1') || ''),
								h('span', { className: 'dcp-hero-display-sub' }, hero.get('titleLine2') || ''),
							),
							h('p', {
								className: 'dcp-hero-tagline',
								dangerouslySetInnerHTML: { __html: tagHtml },
							}),
							h(
								'a',
								{ className: 'dcp-hero-participants', href: hero.get('participantsHref') || '#' },
								h('span', { className: 'dcp-hero-participants-icon', 'aria-hidden': true }, hero.get('participantsIcon') || '◇'),
								h(
									'span',
									{ className: 'dcp-hero-participants-text' },
									h('strong', {}, hero.get('participantsTitle') || ''),
									h('span', { className: 'dcp-hero-participants-hint' }, hero.get('participantsHint') || ''),
								),
								h('span', { className: 'dcp-hero-participants-arrow', 'aria-hidden': true }, '→'),
							),
							h(
								'div',
								{ className: 'dcp-hero-grid' },
								h(
									'div',
									{ className: 'dcp-hero-panel dcp-hero-panel--prose' },
									h('h2', { className: 'dcp-hero-panel-title' }, hero.get('programTitle') || ''),
									h('div', {
										className: 'dcp-hero-program',
										dangerouslySetInnerHTML: { __html: progHtml },
									}),
								),
								h(
									'div',
									{ className: 'dcp-hero-panel dcp-hero-panel--infos' },
									h('h2', { className: 'dcp-hero-panel-title' }, hero.get('infosTitle') || ''),
									h('dl', { className: 'dcp-hero-dl' }, rowEls),
								),
							),
							h('p', {
								className: 'dcp-hero-legal',
								dangerouslySetInnerHTML: { __html: legalHtml },
							}),
							h('p', {
								className: 'dcp-hero-org',
								dangerouslySetInnerHTML: { __html: orgHtml },
							}),
							h(
								'div',
								{ className: 'dcp-hero-cta' },
								h(
									'a',
									{
										className: 'dcp-btn dcp-btn-primary',
										href: hero.get('ctaPrimaryHref') || '#',
									},
									hero.get('ctaPrimaryLabel') || '',
								),
								h(
									'a',
									{
										className: 'dcp-btn dcp-btn-ghost',
										href: hero.get('ctaSecondaryHref') || '#',
									},
									hero.get('ctaSecondaryLabel') || '',
								),
							),
						),
					),
				),
			);
		},
	});

	var NavigationPreview = createClass({
		render: function () {
			var entry = this.props.entry;
			var items = entry.getIn(['data', 'nav', 'items']);
			if (!items || items.size === 0) {
				return h(
					'div',
					{ className: 'decap-nav-preview-wrap' },
					h('p', { className: 'dcp-empty' }, 'Ajoutez des liens dans « Liens du menu » pour voir la barre.'),
				);
			}
			var lis = [];
			items.forEach(function (item, i) {
				var href = item.get('href') || '#';
				var title = item.get('title') || '';
				var emphasized = !!item.get('emphasized');
				var external = /^https?:\/\//i.test(String(href).trim());
				var cls = emphasized ? 'dcp-nav-a dcp-nav-a--highlight' : 'dcp-nav-a';
				var props = { href: href, className: cls };
				if (external) {
					props.target = '_blank';
					props.rel = 'noopener noreferrer';
				}
				lis.push(h('li', { key: i, className: 'dcp-nav-li' }, h('a', props, title)));
			});

			return h(
				'div',
				{ className: 'decap-nav-preview-wrap' },
				h(
					'p',
					{ className: 'dcp-nav-preview-note' },
					'Aperçu de la barre de navigation (rendu proche du site ; pas de lien « actif » ici).',
				),
				h(
					'header',
					{ className: 'dcp-site-head' },
					h(
						'div',
						{ className: 'dcp-site-head-inner' },
						h(
							'div',
							{ className: 'dcp-site-brand' },
							h('a', { className: 'dcp-logo', href: '#' }, 'Bouffons Bios'),
						),
						h(
							'nav',
							{ className: 'dcp-site-nav', 'aria-label': 'Navigation principale' },
							h('ul', { className: 'dcp-nav-ul' }, lis),
						),
						h('div', {
							className: 'dcp-site-head-deco',
							'aria-hidden': 'true',
							dangerouslySetInnerHTML: {
								__html:
									'<svg class="dcp-site-head-deco-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 8c-12 8-22 22-24 38-2 14 6 28 18 34M44 52c-8 6-12 16-10 26 2 12 12 20 24 22M76 48c10-4 18-14 20-26 2-14-4-28-16-36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity="0.35"/><ellipse cx="58" cy="72" rx="10" ry="14" transform="rotate(-28 58 72)" fill="currentColor" opacity="0.2"/><ellipse cx="78" cy="64" rx="8" ry="11" transform="rotate(12 78 64)" fill="currentColor" opacity="0.16"/><ellipse cx="42" cy="68" rx="7" ry="10" transform="rotate(-8 42 68)" fill="currentColor" opacity="0.18"/></svg>',
							},
						}),
					),
				),
			);
		},
	});

	var ArticlePreview = createClass({
		render: function () {
			var entry = this.props.entry;
			var data = entry.get('data');
			var dateRaw = data.get('date');
			var dateLabel = '';
			if (dateRaw) {
				try {
					var d = new Date(dateRaw);
					if (!isNaN(d.getTime())) {
						dateLabel = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
					}
				} catch (e) {
					dateLabel = String(dateRaw);
				}
			}

			return h(
				'article',
				{ className: 'decap-article-preview' },
				h(
					'header',
					{},
					h('p', { className: 'dcp-meta' }, (data.get('category') || '') + (dateLabel ? ' · ' + dateLabel : '')),
					h('h1', {}, data.get('title') || ''),
				),
				data.get('excerpt') ? h('p', { className: 'dcp-excerpt' }, data.get('excerpt')) : null,
				h('div', { className: 'dcp-body' }, this.props.widgetFor('body')),
			);
		},
	});

	/* Fichiers de la collection « site » : le name du fichier YAML (hero, contact, …). */
	CMS.registerPreviewTemplate('hero', HomePreview);
	CMS.registerPreviewTemplate('contact', ContactPreview);
	CMS.registerPreviewTemplate('manifeste', ManifestePreview);
	CMS.registerPreviewTemplate('presse', PressePreview);
	CMS.registerPreviewTemplate('flash', FlashPreview);
	CMS.registerPreviewTemplate('navigation', NavigationPreview);
	CMS.registerPreviewTemplate('articles', ArticlePreview);
})();
