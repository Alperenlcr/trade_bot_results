import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://executortrading.com',
  integrations: [react()],
  // Eski İngilizce adres. GitHub Pages sunucu yönlendirmesi yapamadığı için Astro meta refresh + canonical içeren bir sayfa üretir.
  redirects: {
    '/en': '/',
  },
  i18n: {
    locales: ['en', 'tr', 'ar', 'zh'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
