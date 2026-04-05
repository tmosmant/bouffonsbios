export const prerender = false;

import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

const GITHUB_OWNER = 'tmosmant';
const GITHUB_REPO = 'bouffonsbios';
const WORKFLOW_ID = 'deploy.yml';

type WorkerDeployEnv = {
	DEPLOY_TRIGGER_SECRET?: string;
	GITHUB_DISPATCH_TOKEN?: string;
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let x = 0;
	for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return x === 0;
}

export const POST: APIRoute = async ({ request }) => {
	const e = env as WorkerDeployEnv;
	const expected = e.DEPLOY_TRIGGER_SECRET?.trim() ?? '';
	const token = e.GITHUB_DISPATCH_TOKEN?.trim() ?? '';

	if (!expected || !token) {
		return json(
			{
				error:
					'Déploiement à la demande non configuré (secrets Worker DEPLOY_TRIGGER_SECRET et GITHUB_DISPATCH_TOKEN).',
			},
			503,
		);
	}

	let body: { secret?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide.' }, 400);
	}

	const provided = typeof body?.secret === 'string' ? body.secret : '';
	if (!provided || !timingSafeEqual(provided, expected)) {
		return json({ error: 'Clé incorrecte.' }, 401);
	}

	const ghRes = await fetch(
		`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'User-Agent': 'bouffonsbios-deploy-hook',
			},
			body: JSON.stringify({ ref: 'main' }),
		},
	);

	if (!ghRes.ok) {
		const detail = await ghRes.text();
		return json(
			{
				error: 'GitHub a refusé le déclenchement du workflow.',
				status: ghRes.status,
				detail: detail.slice(0, 800),
			},
			502,
		);
	}

	return json({ ok: true, message: 'Déploiement lancé sur GitHub Actions (branche main).' });
};
