import { createRoot } from 'react-dom/client';

import { installSecureApiFetch } from './lib/apiConfig';
import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

installSecureApiFetch();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
