import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Variáveis mínimas para que src/config/env.js valide durante os testes.
    env: {
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/techdiagnose_test?schema=public',
      JWT_SECRET: 'segredo-apenas-para-testes',
      JWT_EXPIRES_IN: '1d',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
