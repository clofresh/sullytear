import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Prevent browser back-navigation swipe gesture (Chrome Android / Safari iOS).
// Must be non-passive so preventDefault() is allowed.
document.addEventListener(
  'touchstart',
  (e: TouchEvent) => {
    if (e.touches[0].clientX <= 20) {
      e.preventDefault();
    }
  },
  { passive: false },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
