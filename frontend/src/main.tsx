import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

// Drop the static fallback title/description; <Seo> renders per-page tags from here on.
document.querySelectorAll('[data-static-seo]').forEach((el) => el.remove());

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
