import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// The migration ground rules, enforced by lint instead of by memory:
//  - no raw fetch / axios / localStorage / sessionStorage / window.location.href
//  - no "if (mock)" branches in pages (VITE_MOCKS may only be read in dev-stubs)
const groundRules = {
  'no-restricted-globals': [
    'error',
    { name: 'fetch', message: 'Call the backend through a services/*.api.js file (request()).' },
    { name: 'localStorage', message: 'Read session data through useAuth(); only session code may touch storage.' },
    { name: 'sessionStorage', message: 'Read session data through useAuth(); only session code may touch storage.' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'window', property: 'fetch', message: 'Use a services/*.api.js file.' },
    { object: 'window', property: 'localStorage', message: 'Use useAuth().' },
    { object: 'window', property: 'sessionStorage', message: 'Use useAuth().' },
  ],
  'no-restricted-imports': [
    'error',
    { paths: [{ name: 'axios', message: 'Use request() from a services/*.api.js file.' }] },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector:
        "AssignmentExpression[left.property.name='href'][left.object.property.name='location']",
      message: 'Navigate with react-router (useNavigate / <Link>), not window.location.href.',
    },
    {
      selector: "MemberExpression[property.name='VITE_MOCKS']",
      message: 'Pages must work the same in mock and real mode. Do not branch on VITE_MOCKS.',
    },
  ],
};

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      ...groundRules,
    },
  },
  {
    // TEMP-STUB code stands in for M1's foundation and is allowed to touch the platform.
    files: ['src/dev-stubs/**', 'src/test/**'],
    rules: Object.fromEntries(Object.keys(groundRules).map((k) => [k, 'off'])),
  },
];
