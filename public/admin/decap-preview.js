/**
 * Aperçus Decap : la page contact (fichier JSON + objet) n’a pas de template par défaut ;
 * les articles bénéficient d’un rendu titre + corps markdown cohérent.
 */
(function () {
	if (typeof CMS === 'undefined' || typeof createClass === 'undefined' || typeof h === 'undefined') {
		return;
	}

	CMS.registerPreviewStyle('/admin/decap-preview.css');

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

	/* Fichier unique « contact » dans la collection files : le nom du fichier est la clé Decap. */
	CMS.registerPreviewTemplate('contact', ContactPreview);
	CMS.registerPreviewTemplate('manifeste', ManifestePreview);
	CMS.registerPreviewTemplate('articles', ArticlePreview);
})();
