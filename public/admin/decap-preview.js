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

	/** Même règle que sur le site : ligne 2 collée si elle commence par — / – / «- » */
	function dcpInfoLine2SameRow(line2) {
		if (line2 == null || !String(line2).trim()) return false;
		var s = String(line2).trimStart();
		var c = s.codePointAt(0);
		return c === 0x2014 || c === 0x2013 || /^-\s/.test(s);
	}

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

			var links = p.get('asideLinks');
			var linkItems = [];
			if (links && links.size) {
				links.forEach(function (item, i) {
					linkItems.push(
						h(
							'li',
							{ key: i },
							h('a', { href: item.get('href') || '#' }, item.get('label') || ''),
							h('span', { className: 'dcp-link-desc' }, item.get('description') || ''),
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
					'header',
					{ className: 'dcp-hero' },
					h('p', { className: 'dcp-eyebrow' }, p.get('eyebrow') || ''),
					h('h1', {}, p.get('heading') || 'Contact'),
					h('div', { className: 'dcp-lead' }, leadPreview || h('p', {}, p.get('leadMarkdown') || '')),
				),
				h(
					'div',
					{ className: 'dcp-cards' },
					h(
						'a',
						{ className: 'dcp-card', href: email ? 'mailto:' + email : '#' },
						h('span', { className: 'dcp-card-label' }, p.get('emailCardLabel') || 'E-mail'),
						h('span', { className: 'dcp-card-value' }, email),
						h('span', { className: 'dcp-card-hint' }, p.get('emailHint') || ''),
					),
					h(
						'a',
						{ className: 'dcp-card dcp-card--tel', href: tel ? 'tel:' + tel : '#' },
						h('span', { className: 'dcp-card-label' }, p.get('phoneCardLabel') || 'Téléphone'),
						h('span', { className: 'dcp-card-value' }, p.get('phoneContactName') || ''),
						h('span', { className: 'dcp-card-hint' }, phoneHintNbsp),
					),
				),
				linkItems.length
					? h(
							'section',
							{ className: 'dcp-aside' },
							h('h2', {}, p.get('asideTitle') || 'À voir aussi'),
							h('ul', {}, linkItems),
						)
					: null,
				footStr ? h('p', { className: 'dcp-note' }, footStr) : null,
			);
		},
	});

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
			return h(
				'article',
				{ className: 'decap-manifeste-preview' },
				h(
					'header',
					{ className: 'dcp-manifeste-hero' },
					h('p', { className: 'dcp-manifeste-eyebrow' }, p.get('eyebrow') || ''),
					h('h1', {}, p.get('heading') || 'Manifeste'),
					p.get('subtitle') ? h('p', { className: 'dcp-manifeste-sub' }, p.get('subtitle')) : null,
				),
				h('div', { className: 'dcp-manifeste-bar', 'aria-hidden': true }),
				h('div', { className: 'dcp-body dcp-manifeste-md' }, bodyPreview || h('p', {}, p.get('bodyMarkdown') || '')),
				h(
					'footer',
					{ className: 'dcp-manifeste-sign' },
					h('p', {}, p.get('signature') || ''),
				),
			);
		},
	});

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
					lis.push(
						h(
							'li',
							{ key: i },
							h('span', { className: 'dcp-presse-source' }, it.get('source') || ''),
							' — ',
							h('span', { className: 'dcp-presse-title' }, it.get('title') || ''),
							h('div', { className: 'dcp-presse-href' }, it.get('href') || ''),
						),
					);
				});
			}
			return h(
				'aside',
				{ className: 'decap-presse-preview' },
				h('h2', {}, b.get('heading') || ''),
				h('p', { className: 'dcp-presse-intro' }, b.get('intro') || ''),
				lis.length ? h('ul', { className: 'dcp-presse-ul' }, lis) : null,
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
					var l1 = row.get('line1') || '';
					var l2 = row.get('line2');
					var has2 = l2 != null && String(l2).trim() !== '';
					var sameLine = dcpInfoLine2SameRow(l2);
					rowEls.push(
						h(
							'div',
							{ key: i, className: 'dcp-home-dl-row' },
							h('dt', {}, row.get('term') || ''),
							h(
								'dd',
								{},
								l1,
								has2
									? sameLine
										? h(
												'span',
												{},
												'\u00a0',
												h('span', { className: 'dcp-home-dd-muted' }, String(l2)),
											)
										: h(
												'span',
												{},
												h('br'),
												h('span', { className: 'dcp-home-dd-muted' }, String(l2)),
											)
									: null,
							),
						),
					);
				});
			}

			var tagHtml = dcpInlineFormat(hero.get('taglineMarkdown') || '');
			var progHtml = dcpInlineFormat(hero.get('programMarkdown') || '');
			var legalHtml = dcpInlineFormat(hero.get('legalMarkdown') || '');
			var orgHtml = dcpLinkFormat(hero.get('orgMarkdown') || '');

			return h(
				'div',
				{ className: 'decap-home-preview' },
				h(
					'div',
					{ className: 'dcp-home-surface' },
					h(
						'div',
						{ className: 'dcp-home-top' },
						h('span', { className: 'dcp-home-badge' }, hero.get('badge') || ''),
						h('span', { className: 'dcp-home-top-sep', 'aria-hidden': true }, '·'),
						h('time', { className: 'dcp-home-date', dateTime: hero.get('dateDatetime') || '' }, hero.get('dateLabel') || ''),
						h('span', { className: 'dcp-home-hours' }, hero.get('hours') || ''),
					),
					h(
						'h1',
						{ className: 'dcp-home-display' },
						h('span', { className: 'dcp-home-line1' }, hero.get('titleLine1') || ''),
						h('span', { className: 'dcp-home-line2' }, hero.get('titleLine2') || ''),
					),
					h('p', {
						className: 'dcp-home-tagline',
						dangerouslySetInnerHTML: { __html: tagHtml },
					}),
					h(
						'a',
						{ className: 'dcp-home-participants', href: hero.get('participantsHref') || '#' },
						h('span', { className: 'dcp-home-p-ico', 'aria-hidden': true }, hero.get('participantsIcon') || '◇'),
						h(
							'span',
							{ className: 'dcp-home-p-text' },
							h('strong', {}, hero.get('participantsTitle') || ''),
							h('span', { className: 'dcp-home-p-hint' }, hero.get('participantsHint') || ''),
						),
						h('span', { className: 'dcp-home-p-arrow', 'aria-hidden': true }, '→'),
					),
					h(
						'div',
						{ className: 'dcp-home-grid' },
						h(
							'div',
							{ className: 'dcp-home-panel dcp-home-panel--prose' },
							h('h2', { className: 'dcp-home-panel-title' }, hero.get('programTitle') || ''),
							h('div', {
								className: 'dcp-home-program',
								dangerouslySetInnerHTML: { __html: progHtml ? '<p>' + progHtml + '</p>' : '' },
							}),
						),
						h(
							'div',
							{ className: 'dcp-home-panel dcp-home-panel--infos' },
							h('h2', { className: 'dcp-home-panel-title' }, hero.get('infosTitle') || ''),
							h('dl', { className: 'dcp-home-dl' }, rowEls),
						),
					),
					h('p', {
						className: 'dcp-home-legal',
						dangerouslySetInnerHTML: { __html: legalHtml },
					}),
					h('p', {
						className: 'dcp-home-org',
						dangerouslySetInnerHTML: { __html: orgHtml },
					}),
					h(
						'div',
						{ className: 'dcp-home-cta' },
						h(
							'a',
							{
								className: 'dcp-home-btn dcp-home-btn--primary',
								href: hero.get('ctaPrimaryHref') || '#',
							},
							hero.get('ctaPrimaryLabel') || '',
						),
						h(
							'a',
							{
								className: 'dcp-home-btn dcp-home-btn--ghost',
								href: hero.get('ctaSecondaryHref') || '#',
							},
							hero.get('ctaSecondaryLabel') || '',
						),
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
	CMS.registerPreviewTemplate('articles', ArticlePreview);
})();
