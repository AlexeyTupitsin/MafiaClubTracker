import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // MafiaClubTracker.jsx — старый прототип вне git
  { ignores: ['dist/', '.codegraph/', 'docs/', 'node_modules/', 'MafiaClubTracker.jsx'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Только классические правила хуков: строгие правила React Compiler
      // из recommended v7 на существующем коде дают в основном шум.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  {
    // Конфиги и тесты выполняются в Node
    files: ['*.config.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
