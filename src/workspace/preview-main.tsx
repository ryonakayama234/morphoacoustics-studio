import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspacePreview } from './WorkspacePreview';

const target = document.getElementById('root');
if (!target) throw new Error('workspace preview root missing');
createRoot(target).render(<StrictMode><WorkspacePreview /></StrictMode>);
