import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    // The public preview is served through this trusted worker domain.
    allowedHosts: ['.omgithub.com'],
  },
});
