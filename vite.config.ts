import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const repoBase = '/ai-omok-master/'

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? repoBase : '/',
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
