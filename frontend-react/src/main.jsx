// TEMP-STUB: stands in for M1's entry point. Delete when react-foundation is merged.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/dev-stubs/styles/stub.css';
import App from '@/App.jsx';
import { loadMocks } from '@/dev-stubs/mock/loadMocks.js';

loadMocks().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
