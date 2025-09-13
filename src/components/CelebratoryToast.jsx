import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import Confetti from 'react-confetti';
import UPHLogo from '../assets/UPH_Logo(black).png';


function CelebratoryToast({ isVisible, onComplete, message = "Booking Confirmed!", eventTitle }) {
  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle close directly
  const handleClose = () => {
    onComplete?.();
  };

  // Auto-complete after 4 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const isMobile = window.innerWidth < 640;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none flex justify-center"
          style={{
            alignItems: isMobile ? 'flex-start' : 'center',
            paddingTop: isMobile ? '38vh' : '8vh',
            paddingBottom: isMobile ? '5vh' : '0'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* React Confetti with custom colors */}
          <Confetti
            width={windowDimension.width}
            height={windowDimension.height}
            colors={[
              '#f5f4d7', '#b1bda5', '#f5f4d7', '#b1bda5', // Primi due colori ripetuti
              '#BDA9F1', '#BDA9F1', '#BDA9F1', '#BDA9F1'  // Ultimo colore 4 volte (doppio)
            ]}
            numberOfPieces={250}
            recycle={false}
            run={isVisible}
            initialVelocityY={{ min: 5, max: 15 }}
          />

          {/* Main celebration message */}
          <motion.div
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center border border-white/20 relative pointer-events-auto"
            initial={{
              opacity: 0,
              scale: 0.5,
              y: 50
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              y: -20
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.1
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {/* Success icon with pulse */}
            <motion.div
  className="flex justify-center mb-6"
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{
    delay: 0.3,
    type: "spring",
    stiffness: 400,
    damping: 15
  }}
>
  <motion.div
    animate={{
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className="flex justify-center"
  >
    <img 
      src={UPHLogo} 
      alt="UPH Logo"
      className="h-16 w-auto object-contain"
    />
  </motion.div>
</motion.div>

            {/* Message text */}
            <motion.h3
              className="text-2xl font-bold text-gray-800 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {eventTitle ? (
                <>
                  Booking confirmed for
                  <br />
                  <span className="text-xl">{eventTitle}</span>
                </>
              ) : (
                message
              )}
            </motion.h3>

            <motion.p
              className="text-gray-600"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              Hold tight, your confirmation email is landing in your inbox any moment now 🛬
            </motion.p>
          </motion.div>


        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CelebratoryToast;