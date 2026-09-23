import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.test.local' })

export default defineConfig({
  test: { environment: 'node', testTimeout: 20000 },
})
