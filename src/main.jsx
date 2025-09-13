import React from 'react'
import ReactDOM from 'react-dom/client'
//import { createHashRouter, RouterProvider } from 'react-router-dom'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import App from './App.jsx'
import './index.css'
import AdminPanel from './pages/AdminPanel.jsx'
import NotFound from './pages/NotFound.jsx'

// // Function to handle iOS viewport resize
// function handleViewportResize() {
//   const vh = window.innerHeight;
//   document.body.style.height = `${vh}px`;
//   document.getElementById('root').style.height = `${vh}px`;
// }

// PayPal initial options
const paypalOptions = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: "EUR",
  intent: "capture"
};

// BrowserRouter con basename = BASE_URL (in dev è '/', su GH Pages è '/urban-ph/')
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />
  },
  {
    // ALIAS route: render the same App at /events as well.
    path: '/events',
    element: <App />,
  },
  {
    path: '/admin',
    element: <AdminPanel />,
  },
  {
    path: '*',
    element: <NotFound />
  }
], {
  basename: import.meta.env.BASE_URL
});


// Aggiungi questo PRIMA del ReactDOM.createRoot in main.jsx

// Viewport height fix per browser che non supportano svh
if (!CSS.supports('height', '100svh')) {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVh();
  let timeout;
  window.addEventListener('resize', () => {
    clearTimeout(timeout);
    timeout = setTimeout(setVh, 100);
  });

  // Aggiungi fallback al CSS
  const style = document.createElement('style');
  style.textContent = `
    .min-h-screen { min-height: calc(var(--vh, 1vh) * 100) !important; }
    .h-screen-stable { height: calc(var(--vh, 1vh) * 100) !important; }
  `;
  document.head.appendChild(style);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <RouterProvider router={router} />
    </PayPalScriptProvider>
  </React.StrictMode>,
);

// let resizeTimeout;
// window.addEventListener('resize', () => {
//   clearTimeout(resizeTimeout);
//   resizeTimeout = setTimeout(handleViewportResize, 100);
// });
// window.addEventListener('orientationchange', handleViewportResize);
// handleViewportResize();