export const prerender = false;

import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}

export const POST: APIRoute = async ({ request }) => {
	const db = (env as unknown as { NEWSLETTER_DB?: D1Database }).NEWSLETTER_DB;

	if (!db) {
		return json({ error: 'Service indisponible — base de données non configurée.' }, 503);
	}

	let email: string;
	try {
		const body = await request.json();
		email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
	} catch {
		return json({ error: 'Corps de requête invalide.' }, 400);
	}

	if (!email || !EMAIL_RE.test(email)) {
		return json({ error: 'Adresse e-mail invalide.' }, 400);
	}

	if (email.length > 254) {
		return json({ error: 'Adresse e-mail trop longue.' }, 400);
	}

	const source = new URL(request.url).searchParams.get('source') ?? 'site';

	try {
		const result = await db
			.prepare('INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)')
			.bind(email, source)
			.run();

		const alreadySubscribed = result.meta.changes === 0;
		return json({ ok: true, alreadySubscribed });
	} catch (err) {
		console.error('[newsletter] DB error:', err);
		return json({ error: 'Erreur serveur, réessayez dans quelques instants.' }, 500);
	}
};
