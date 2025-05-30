import { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { auth } from '../../firebase/config';
import { createUserProfile } from '../../firebase/userServices';

function AuthModal({ isOpen, onClose, event }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Reset error and useMagicLink when modal opens or closes
  useEffect(() => {
    // Reset error state when modal opens or closes
    setError('');
    setUseMagicLink(false);
  }, [isOpen]);

  useEffect(() => {
    // Controlla se l'URL contiene un link di sign-in email
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setIsSigningIn(true);
      
      const processSignInLink = async () => {
        let storedEmail = window.localStorage.getItem('emailForSignIn');
        
        // Se non c'è email salvata, chiedi SOLO SE non stiamo già processando
        if (!storedEmail) {
          // Aggiungiamo una flag per evitare prompt multipli
          const isProcessingSignIn = sessionStorage.getItem('isProcessingSignIn');
          
          if (!isProcessingSignIn) {
            sessionStorage.setItem('isProcessingSignIn', 'true');
            
            // Solo se necessario, prova a estrarre dall'URL
            const extractEmailFromUrl = () => {
              const urlParams = new URLSearchParams(window.location.search);
              return urlParams.get('email');
            };
            
            const urlEmail = extractEmailFromUrl();
            
            if (!urlEmail) {
              const promptEmail = window.prompt('Please provide your email for confirmation');
              if (promptEmail) {
                storedEmail = promptEmail;
                window.localStorage.setItem('emailForSignIn', promptEmail);
              } else {
                // Se l'utente cancella il prompt, pulisce l'URL e chiude
                cleanupUrl();
                sessionStorage.removeItem('isProcessingSignIn');
                setIsSigningIn(false);
                return;
              }
            } else {
              storedEmail = urlEmail;
              window.localStorage.setItem('emailForSignIn', urlEmail);
            }
          } else {
            // Se stiamo già processando, aspetta un po' e riprova
            setTimeout(() => {
              processSignInLink();
            }, 100);
            return;
          }
        }

        try {
          const result = await signInWithEmailLink(auth, storedEmail, window.location.href);
          await createUserProfile(result.user);
          window.localStorage.removeItem('emailForSignIn');
          sessionStorage.removeItem('isProcessingSignIn');
          cleanupUrl();
          onClose();
        } catch (err) {
          console.error("Email link sign-in failed", err);
          setError('Invalid or expired sign-in link.');
          sessionStorage.removeItem('isProcessingSignIn');
          cleanupUrl();
        } finally {
          setIsSigningIn(false);
        }
      };

      processSignInLink();
    }
  }, []); // Rimuovi onClose dalla dependency array per evitare re-renders

  // Funzione di pulizia URL separata per evitare duplicazione
  const cleanupUrl = () => {
    const url = new URL(window.location.href);
    ['apiKey', 'oobCode', 'mode', 'lang', 'email'].forEach(param => {
      url.searchParams.delete(param);
    });
    window.history.replaceState({}, document.title, url.pathname + url.hash);
  };

  // Function to handle modal close with cleanup
  const handleClose = () => {
    setError('');
    setLoading(false);
    setUseMagicLink(false);
    onClose();
  };

  // Non renderizzare se si sta processando il sign-in
  if (isSigningIn) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  // Styling diretto per assicurarsi che il modale sia visibile
  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    position: 'relative'
  };

  const handleEmailLinkAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      alert('A sign-in link has been sent to your email. Please check your inbox.');
    } catch (error) {
      console.error("Email link error:", error);
      setError('Failed to send sign-in link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Imposta la persistenza prima del sign-in
      await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
      
      const provider = new GoogleAuthProvider();
      
      // Forza la selezione dell'account
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Crea o aggiorna il profilo utente nel database
      await createUserProfile(result.user);
      handleClose();
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Imposta la persistenza prima del sign-in
      await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
      
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Crea o aggiorna il profilo utente nel database
      await createUserProfile(result.user);
      handleClose();
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      setError('Facebook sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'}}>
          {useMagicLink ? 'Sign In with Magic Link' : 'Sign In'} to Urban PH
        </h2>
        
        <button 
          onClick={handleClose}
          style={{position: 'absolute', right: '16px', top: '16px', cursor: 'pointer'}}
        >
          Close
        </button>

        <h3 style={{fontSize: '18px', marginBottom: '12px'}}>
          {event?.title || ''}
        </h3>
        
        {error && (
          <div style={{padding: '10px', backgroundColor: '#FEE2E2', color: '#B91C1C', marginBottom: '16px', borderRadius: '4px'}}>
            {error}
          </div>
        )}

        {!useMagicLink && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%', 
                padding: '10px', 
                marginBottom: '20px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" style={{marginRight: '8px'}}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleFacebookSignIn}
              disabled={loading}
              style={{
                width: '100%', 
                padding: '10px', 
                marginBottom: '20px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" style={{marginRight: '8px', fill: '#1877F2'}}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>

            <div style={{marginBottom: '20px', position: 'relative', textAlign: 'center'}}>
              <span style={{backgroundColor: 'white', padding: '0 10px', position: 'relative', zIndex: 1}}>
                Or continue with email
              </span>
            </div>

            <button
              onClick={() => setUseMagicLink(true)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              Use Magic Link (Passwordless)
            </button>
            
            {/* Checkbox per Keep me signed in */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                id="keepSignedIn"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                style={{marginRight: '8px'}}
              />
              <label 
                htmlFor="keepSignedIn" 
                style={{cursor: 'pointer', fontSize: '14px'}}
              >
                Keep me signed in
              </label>
            </div>
          </>
        )}

        {useMagicLink && (
          <form onSubmit={handleEmailLinkAuth}>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px'}} htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                placeholder="your@email.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: loading ? '#93C5FD' : '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: loading ? 'wait' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
            </button>
            
            <button
              type="button"
              onClick={() => setUseMagicLink(false)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#2563EB',
                border: '1px solid #2563EB',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Back to Options
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;