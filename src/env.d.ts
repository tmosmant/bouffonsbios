/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare module 'cloudflare:workers' {
	const env: {
		NEWSLETTER_DB: D1Database;
		PUBLIC_MAPBOX_ACCESS_TOKEN: string;
		/** Clé partagée : saisie sur /admin/deploy.html pour lancer le workflow GitHub */
		DEPLOY_TRIGGER_SECRET?: string;
		/** PAT GitHub (repo) avec permission Actions : write — jamais exposé au navigateur */
		GITHUB_DISPATCH_TOKEN?: string;
	};
	export { env };
}
