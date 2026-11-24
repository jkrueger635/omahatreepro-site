import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://omahatreepro.com', // CHANGE: the live domain (no trailing slash). Must match src/data/site.js `url`.
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
