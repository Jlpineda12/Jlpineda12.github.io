// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages: set SITE and BASE_PATH in the deploy workflow.
// A user site (Jlpineda12.github.io) uses BASE_PATH="/"; a project repo uses "/<repo>".
export default defineConfig({
  site: process.env.SITE || 'https://jlpineda12.github.io',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  build: { assets: 'assets' },
});
