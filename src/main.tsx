import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import WorkspaceV0 from './WorkspaceV0';
import './app.css';

// A real, directly reachable legacy harness entry. Query routing works without
// a server-side SPA rewrite and preserves the old App/localStorage/experiments.
const legacy = new URLSearchParams(window.location.search).get('view') === 'legacy';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {legacy ? <App /> : <WorkspaceV0 />}
  </StrictMode>,
);
