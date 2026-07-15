import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/test/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'packages/{game-contracts,difficulty,jump-engine,gameplay,application,content,feedback,persistence}/src/**/*.ts',
        'src/config.ts',
        'src/entry/{launch-game,mini-game-startup-fallback,web-startup-fallback}.ts',
      ],
      exclude: ['packages/*/src/index.ts', 'packages/feedback/src/ports.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
