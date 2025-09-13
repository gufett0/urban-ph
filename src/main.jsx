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


if (!CSS.supports('height', '100svh')) {
  // Calcola l'altezza con la barra sempre visibile
  const calculateStableVh = () => {
    // Prendi l'altezza iniziale (di solito con barra visibile)
    const vh = window.innerHeight;
    // Non aggiornare se lo schermo diventa più alto (barra che scompare)
    const root = document.documentElement;
    const currentVh = parseInt(root.style.getPropertyValue('--stable-vh')) || vh;
    
    // Usa sempre il valore più piccolo (barra visibile)
    if (!root.style.getPropertyValue('--stable-vh') || vh < currentVh) {
      root.style.setProperty('--stable-vh', `${vh}px`);
    }
  };
  
  // Setta inizialmente
  calculateStableVh();
  
  // Aggiorna solo su resize significativo (rotazione schermo)
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastWidth) > 100) {
      lastWidth = window.innerWidth;
      calculateStableVh();
    }
  });
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