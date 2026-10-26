import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/logic/**/*.test.ts'],
    reporters: ['default', ['json', { outputFile: 'reports/raw/vitest.json' }]],
  },
});
