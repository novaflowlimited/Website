import { defineConfig } from 'astro/config';

const site = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:4321').replace(/\/$/, '');

export default defineConfig({
  site,
  server: {
    host: true,
    port: 4321,
  },
  redirects: {
    '/work': '/case-studies',
    '/solutions': '/',
  },
});
