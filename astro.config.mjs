import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dailycryptonews.online',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
