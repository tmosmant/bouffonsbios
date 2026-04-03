/**
 * Gravatar pour l’avatar utilisateur Decap : hash MD5 + fallback GitHub
 * envoyés par le worker OAuth (postMessage après connexion).
 * Origines autorisées = même hôtes que `backend.base_url` dans config.yml (+ dev local).
 */
(function () {
	var STORAGE_HASH = 'bb_admin_gravatar_hash';
	var STORAGE_FALLBACK = 'bb_admin_avatar_fallback';
	var ALLOWED_ORIGINS = [
		'https://bouffonsbios-oauth.thomas-mosmant.workers.dev',
		'http://127.0.0.1:8787',
		'http://localhost:8787',
	];

	window.addEventListener('message', function (e) {
		var d = e.data;
		if (!d || d.source !== 'bouffonsbio-oauth' || d.type !== 'bb-avatar') return;
		if (ALLOWED_ORIGINS.indexOf(e.origin) === -1) return;
		try {
			if (d.hash) localStorage.setItem(STORAGE_HASH, d.hash);
			else localStorage.removeItem(STORAGE_HASH);
			if (d.fallback) localStorage.setItem(STORAGE_FALLBACK, d.fallback);
			else localStorage.removeItem(STORAGE_FALLBACK);
		} catch (_) {}
		schedulePatch();
	});

	function readStorage() {
		try {
			return {
				hash: localStorage.getItem(STORAGE_HASH) || '',
				fallback: localStorage.getItem(STORAGE_FALLBACK) || '',
			};
		} catch (_) {
			return { hash: '', fallback: '' };
		}
	}

	function gravatarUrl(size) {
		var s = readStorage();
		if (!s.hash) return null;
		var d = s.fallback ? encodeURIComponent(s.fallback) : 'identicon';
		return 'https://www.gravatar.com/avatar/' + s.hash + '?s=' + size + '&d=' + d;
	}

	var scheduled = false;
	function schedulePatch() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(function () {
			scheduled = false;
			patchAvatars();
		});
	}

	function patchAvatars() {
		var root = document.getElementById('nc-root');
		if (!root) return;
		var imgs = root.querySelectorAll('img[src*="avatars.githubusercontent.com"]');
		for (var i = 0; i < imgs.length; i++) {
			var img = imgs[i];
			var w = img.width || img.naturalWidth || 40;
			var size = Math.max(48, Math.min(256, (w || 40) * 2)) | 0;
			var u = gravatarUrl(size);
			if (!u) continue;
			img.src = u;
		}
	}

	var mo = new MutationObserver(schedulePatch);
	mo.observe(document.documentElement, { childList: true, subtree: true });
	schedulePatch();
})();
