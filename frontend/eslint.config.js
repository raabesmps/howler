import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: { globals: { ...globals.browser }, parserOptions: { parser: tseslint.parser } },
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  { files: ['**/*.js', 'vite.config.ts', 'server/**/*.ts'], languageOptions: { globals: { ...globals.node } } },
)
