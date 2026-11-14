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
    lib: { entry: 'src/facebook/observer.ts', name: 'FFBLensObserver', formats: ['iife'], fileName: () => 'facebook-observer.js' },
    minify: true
  }
});
