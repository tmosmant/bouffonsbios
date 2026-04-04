// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// @astrojs/cloudflare v13 intègre @cloudflare/vite-plugin :
// `astro dev` tourne dans Miniflare avec les vrais bindings (D1, KV…).
export default defineConfig({
  site: 'https://bouffonsbios.org',
  adapter: cloudflare(),
});