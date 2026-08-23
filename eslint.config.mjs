import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'node_modules/**',
    'coverage/**',
    'src-tauri/target/**',
    'workers/cloud-backup/.wrangler/**',
  ]),
  {
    rules: {
      // Tauri static export, blob/file gift images, student avatars — not next/image.
      '@next/next/no-img-element': 'off',
      // Avoid risky hook rewrites in untouched game/ranking code; warnings only.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
])
