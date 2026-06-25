import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Bootstrap React application into root DOM node.
createRoot(document.getElementById('root')!).render(
  <App />
);
