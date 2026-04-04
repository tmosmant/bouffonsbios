/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare module 'cloudflare:workers' {
	const env: {
		NEWSLETTER_DB: D1Database;
		PUBLIC_MAPBOX_ACCESS_TOKEN: string;
	};
	export { env };
}
