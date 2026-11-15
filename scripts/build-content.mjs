import { build } from 'vite';

await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: 'src/facebook/content.ts', name: 'FFBLensContent', formats: ['iife'], fileName: () => 'content.js' },
    minify: true
  }
});

await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: 'src/tiktok/content.ts', name: 'FFBLensTikTokContent', formats: ['iife'], fileName: () => 'tiktok-content.js' },
    minify: true
  }
});

await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: 'src/tiktok/observer.ts', name: 'FFBLensTikTokObserver', formats: ['iife'], fileName: () => 'tiktok-observer.js' },
    minify: true
  }
});

await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: 'src/facebook/observer.ts', name: 'FFBLensObserver', formats: ['iife'], fileName: () => 'facebook-observer.js' },
    minify: true
  }
});
