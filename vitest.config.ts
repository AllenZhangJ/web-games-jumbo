import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/test/**/*.test.ts',
      'tests/governance/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 55,
        branches: 60,
        functions: 60,
        lines: 55,
        'packages/arena-contracts/src/**': {
          statements: 80,
          branches: 75,
          functions: 90,
          lines: 80,
        },
        'packages/arena-definitions/src/**': {
          statements: 88,
          branches: 68,
          functions: 85,
          lines: 88,
        },
        'packages/arena-core/src/**': {
          statements: 55,
          branches: 65,
          functions: 68,
          lines: 55,
        },
        'packages/arena-equipment/src/**': {
          statements: 78,
          branches: 58,
          functions: 75,
          lines: 78,
        },
        'packages/arena-map/src/**': {
          statements: 85,
          branches: 72,
          functions: 94,
          lines: 85,
        },
        'packages/arena-movement/src/**': {
          statements: 72,
          branches: 58,
          functions: 65,
          lines: 72,
        },
        'packages/arena-physics/src/**': {
          statements: 78,
          branches: 70,
          functions: 90,
          lines: 78,
        },
        'packages/arena-match/src/**': {
          statements: 55,
          branches: 68,
          functions: 55,
          lines: 55,
        },
        'packages/arena-input-pilot/src/**': {
          statements: 78,
          branches: 55,
          functions: 64,
          lines: 78,
        },
        'packages/arena-product-state/src/**': {
          statements: 90,
          branches: 73,
          functions: 92,
          lines: 90,
        },
        'packages/arena-product-match/src/**': {
          statements: 90,
          branches: 66,
          functions: 72,
          lines: 90,
        },
        'packages/arena-product-session/src/**': {
          statements: 92,
          branches: 66,
          functions: 68,
          lines: 92,
        },
        'packages/arena-product-presentation/src/**': {
          statements: 80,
          branches: 63,
          functions: 52,
          lines: 80,
        },
        'packages/arena-platform-runtime/src/**': {
          statements: 68,
          branches: 55,
          functions: 58,
          lines: 68,
        },
      },
    },
  },
});
