// spa-redirect.js - Add this to your public folder
// This script handles GitHub Pages SPA routing
(function() {
    // Get the current path from the URL query parameter
    const query = window.location.search;
    const pathParam = new URLSearchParams(query).get('p');
    
    if (pathParam) {
      // Remove the p parameter and replace the history state
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, null, newUrl);
      
      // Set up the SPA router to handle the path
      const path = pathParam.replace(/^\/?/, '/');
      console.log('SPA redirect to path:', path);
      
      // You can add your router logic here if needed
      // For now, we're just ensuring the base app loads
    }
  })();