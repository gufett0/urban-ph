import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EventCard from './components/EventCard';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { initializeFirestore } from '../firebase/setupFirebase';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentEvent] = useState({
    title: "Urban Photography Adventure: City Lights",
    date: "April 20, 2025",
    time: "6:00 PM - 9:00 PM",
    location: "Downtown Central Plaza",
    description: "Join us for a magical evening photography walk through the city. Capture the urban landscape as it transforms with the setting sun and city lights. Perfect for all photography levels!",
    spots: 15,
    spotsLeft: 8,
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=600&auto=format"
  });

  useEffect(() => {
    console.log("App component mounted");
    console.log("Current pathname:", window.location.pathname);
    console.log("Current host:", window.location.host);
    console.log("Current href:", window.location.href);
    
    // Check if we're on GitHub Pages
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
      console.log("Running on GitHub Pages");
    }
    
    // Initialize Firebase data (only run once)
    initializeFirestore().catch(err => {
      console.error("Failed to initialize Firestore:", err);
    });
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser ? "User logged in" : "No user");
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-xl">Loading Urban Photo Hunts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      
      <main>
        <Hero />
        
        <section id="current-event" className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Current Event</h2>
          <EventCard 
            event={currentEvent} 
            user={user}
          />
        </section>
      </main>
      
      <footer className="bg-gray-800 text-white text-center py-6">
        <p>© {new Date().getFullYear()} Urban Photo Hunts. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;