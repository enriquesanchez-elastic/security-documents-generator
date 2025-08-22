import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/types/**',
        'src/mappings/**',
        'src/schemas/**',
        'src/templates/**',
        'src/index.ts',
        'src/mcp_server.ts',
        'src/get_config.ts',
        'src/constants.ts',
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 70,
          lines: 75,
          statements: 75,
        },
        'src/utils/validation_service.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/utils/cache_service.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/utils/timestamp_utils.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});