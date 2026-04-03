/**
 * Proxy OAuth GitHub pour Decap CMS (backend github sans Netlify).
 * Secrets : npx wrangler secret put GITHUB_OAUTH_SECRET -c workers/decap-oauth/wrangler.jsonc
 * Client ID (public) : npx wrangler vars put GITHUB_OAUTH_ID -c workers/decap-oauth/wrangler.jsonc
 */

import { createHash } from 'node:crypto';

interface Env {
	GITHUB_OAUTH_ID: string;
	GITHUB_OAUTH_SECRET: string;
}

interface GitHubEmailRow {
	email: string;
	primary?: boolean;
	verified?: boolean;
}

const GH_API_HEADERS = {
	Accept: 'application/vnd.github+json',
	'User-Agent': 'bouffonsbio-decap-oauth',
} as const;

function md5HexLowerEmail(email: string): string {
	const normalized = email.trim().toLowerCase();
	return createHash('md5').update(normalized, 'utf8').digest('hex');
}

/** E-mail vérifié (primaire de préférence) pour Gravatar ; `avatar_url` pour le paramètre `d=` si pas d’image Gravatar. */
async function githubIdentityForAvatar(token: string): Promise<{ email: string; avatar_url: string }> {
	const auth = { Authorization: `Bearer ${token}`, ...GH_API_HEADERS };
	const uRes = await fetch('https://api.github.com/user', { headers: auth });
	const user = (await uRes.json()) as { email?: string | null; avatar_url?: string | null };
	const avatar_url = typeof user.avatar_url === 'string' ? user.avatar_url : '';

	const eRes = await fetch('https://api.github.com/user/emails', { headers: auth });
	const emails = (await eRes.json()) as GitHubEmailRow[] | { message?: string };
	let email = '';
	if (Array.isArray(emails)) {
		const primary = emails.find((r) => r.primary && r.verified);
		const anyVerified = emails.find((r) => r.verified);
		email = primary?.email || anyVerified?.email || '';
	}
	if (!email && user.email) email = user.email;

	return { email, avatar_url };
}

function randomState(): string {
	const buf = new Uint8Array(16);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function authRedirect(url: URL, env: Env): Response {
	if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
		return new Response(
			'Configure GITHUB_OAUTH_ID (var) et GITHUB_OAUTH_SECRET (secret). Voir README.',
			{ status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
		);
	}
	const provider = url.searchParams.get('provider');
	if (provider !== 'github') {
		return new Response('Invalid provider', { status: 400 });
	}
	const redirectUri = `https://${url.hostname}/callback?provider=github`;
	const scope = 'public_repo,user,user:email';
	const state = randomState();
	const authorize = new URL('https://github.com/login/oauth/authorize');
	authorize.searchParams.set('client_id', env.GITHUB_OAUTH_ID);
	authorize.searchParams.set('redirect_uri', redirectUri);
	authorize.searchParams.set('scope', scope);
	authorize.searchParams.set('state', state);
	authorize.searchParams.set('allow_signup', 'false');
	return Response.redirect(authorize.toString(), 302);
}

async function exchangeCode(code: string, redirectUri: string, env: Env): Promise<string> {
	const res = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			client_id: env.GITHUB_OAUTH_ID,
			client_secret: env.GITHUB_OAUTH_SECRET,
			code,
			redirect_uri: redirectUri,
		}),
	});
	const data = (await res.json()) as {
		access_token?: string;
		error?: string;
		error_description?: string;
	};
	if (!data.access_token) {
		throw new Error(data.error_description || data.error || 'Token exchange failed');
	}
	return data.access_token;
}

function callbackHtml(
	accessToken: string,
	avatarMeta: { gravatarHash: string; avatarFallback: string },
): Response {
	const oauthPayload = { token: accessToken, provider: 'github' as const };
	const embedded = JSON.stringify(oauthPayload);
	const bbAvatar = JSON.stringify({
		source: 'bouffonsbio-oauth',
		type: 'bb-avatar',
		hash: avatarMeta.gravatarHash,
		fallback: avatarMeta.avatarFallback,
	});
	const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Connexion GitHub</title></head>
<body>
<p>Connexion… vous pouvez fermer cet onglet.</p>
<script>
(function () {
  var oauthPayload = ${embedded};
  var bbAvatar = ${bbAvatar};
  function onMessage() {
    window.opener.postMessage('authorization:github:success:' + JSON.stringify(oauthPayload), '*');
    try {
      window.opener.postMessage(bbAvatar, '*');
    } catch (e) {}
    window.removeEventListener('message', onMessage);
  }
  window.addEventListener('message', onMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;
	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
	});
}

function callbackError(message: string): Response {
	const errPayload = { error: message };
	const embedded = JSON.stringify(errPayload);
	const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Erreur</title></head>
<body>
<p>Échec de la connexion.</p>
<script>
(function () {
  var errPayload = ${embedded};
  function onMessage() {
    window.opener.postMessage('authorization:github:error:' + JSON.stringify(errPayload), '*');
    window.removeEventListener('message', onMessage);
  }
  window.addEventListener('message', onMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;
	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/auth') {
			return authRedirect(url, env);
		}
		if (url.pathname === '/callback') {
			const provider = url.searchParams.get('provider');
			if (provider !== 'github') {
				return new Response('Invalid provider', { status: 400 });
			}
			const code = url.searchParams.get('code');
			if (!code) {
				return callbackError('Missing code');
			}
			try {
				const redirectUri = `https://${url.hostname}/callback?provider=github`;
				const token = await exchangeCode(code, redirectUri, env);
				const { email, avatar_url } = await githubIdentityForAvatar(token);
				const gravatarHash = email ? md5HexLowerEmail(email) : '';
				return callbackHtml(token, { gravatarHash, avatarFallback: avatar_url });
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error';
				return callbackError(msg);
			}
		}
		return new Response('Decap OAuth proxy — utiliser /auth', {
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	},
};
