import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // Use the automatic JSX runtime so components don't need `import React`.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    // Component tests (*.test.tsx) run in jsdom; pure logic tests stay in node.
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
