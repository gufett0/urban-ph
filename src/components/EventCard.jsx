import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BookingForm from './BookingForm';
import PaymentModal from './PaymentModal';
import CelebratoryToast from './CelebratoryToast';
import RoughNotationText from './RoughNotationText';
import LoadingSpinner from './LoadingSpinner';
import EventCardDesktopLayout from './EventCard/EventCardDesktopLayout';
import EventCardMobileLayout from './EventCard/EventCardMobileLayout';
import { useEventCardPosition } from '../contexts/EventCardPositionContext';

// Custom hooks
import { useEventCardState } from '../hooks/useEventCardState';
import { useEventCardHandlers } from '../hooks/useEventCardHandlers';

// Utils
import {
  containerVariants,
  createImageVariants,
  createContentVariants,
  createMobileVariants,
  getButtonState,
  getButtonText
} from '../utils/eventCardUtils';

function EventCard({ event, user, onAuthNeeded, index = 0 }) {

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // State management via custom hook
  const state = useEventCardState(event, user);

  // Additional state for celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  // Position tracking
  const { updateEventCardPosition } = useEventCardPosition();

  // Enhanced handlers with celebration
  const baseHandlers = useEventCardHandlers({
    event,
    user,
    onAuthNeeded,
    isBookable: state.isBookable,
    bookableReason: state.bookableReason,
    isBooked: state.isBooked,
    bookingStatus: state.bookingStatus,
    applicablePrice: state.applicablePrice,
    bookingFormData: state.bookingFormData,
    setLoading: state.setLoading,
    setAuthError: state.setAuthError,
    setAuthRequested: state.setAuthRequested,
    setIsFirstTimeBooking: state.setIsFirstTimeBooking,
    setExistingUserData: state.setExistingUserData,
    setShowBookingForm: state.setShowBookingForm,
    setBookingFormData: state.setBookingFormData,
    setShowPaymentModal: state.setShowPaymentModal,
    setIsBooked: state.setIsBooked,
    setBookingSuccess: state.setBookingSuccess,
    setBookingStatus: state.setBookingStatus,
    setShouldAnimate: state.setShouldAnimate,
    setAllowRoughAnimations: state.setAllowRoughAnimations,
    setBookingJustCompleted: state.setBookingJustCompleted,
    setAnnotationTrigger: state.setAnnotationTrigger,
    setImageError: state.setImageError
  });

  const shouldAnimate = state.shouldAnimate && !isMobile;

  // Enhanced handlers with celebration triggers
  const handlers = {
    ...baseHandlers,

    handleFormSubmit: async (formData) => {
      try {
        const result = await baseHandlers.handleFormSubmit(formData);

        // Show celebration only if booking is completed (no payment required)
        if (result?.success && !result?.requiresPayment) {
          setCelebrationMessage('Booking Confirmed!');
          setShowCelebration(true);
        }

        return result;
      } catch (error) {
        console.error('Form submission error:', error);
        throw error;
      }
    },

    handlePaymentSuccess: async (paymentData) => {
      try {
        const result = await baseHandlers.handlePaymentSuccess(paymentData);

        // Show celebration after successful payment
        if (result?.success) {
          setCelebrationMessage('Payment Successful!');
          setShowCelebration(true);
        }

        return result;
      } catch (error) {
        console.error('Payment success error:', error);
        throw error;
      }
    },

    handleCelebrationComplete: () => {
      setShowCelebration(false);
      setCelebrationMessage('');
    }
  };

  // Derived values
  const isImageLeft = index % 2 === 0;
  const { isClosedForBooking, isFullyBooked, isInteractiveButton } = getButtonState(
    state.isBooked,
    state.bookingStatus,
    state.loading,
    state.isBookable
  );

  // Check if event should appear as "completed/booked"
  const isEventBooked = state.isBooked && state.bookingStatus !== 'cancelled';
  const shouldShowBookedState = isEventBooked && !state.showBookingForm && !state.showPaymentModal;

  // Position tracking effect
  useEffect(() => {
    if (!state.cardRef.current || !updateEventCardPosition) return;

    const updatePosition = () => {
      const rect = state.cardRef.current.getBoundingClientRect();
      updateEventCardPosition(rect, index);
    };

    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(state.cardRef.current);
    window.addEventListener('resize', updatePosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [updateEventCardPosition, index]);

  // User auth effect
  useEffect(() => {
    if (!state.prevUserState && user && state.authRequested && !state.isBooked) {
      handlers.handleBookEvent();
      state.setAuthRequested(false);
    }
    state.setPrevUserState(user);
  }, [user, state.authRequested, state.isBooked]);

  // Animation effects
  useEffect(() => {
    if (state.roughAnimationsReady) {
      state.setAnnotationTrigger(prev => prev + 1);
    }
  }, [state.showFullDescription, state.roughAnimationsReady]);

  useEffect(() => {
    let resizeTimer;
    const handleResize = () => {
      if (state.roughAnimationsReady) {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          state.setAnnotationTrigger(prev => prev + 1);
        }, 200);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [state.roughAnimationsReady]);

  // Animation variants
  const imageVariants = createImageVariants(isImageLeft);
  const contentVariants = createContentVariants(
    isImageLeft,
    state.setCardVisible,
    state.setRoughAnimationsReady
  );
  const mobileVariants = createMobileVariants(
    state.setCardVisible,
    state.setRoughAnimationsReady
  );

  // Button content logic
  const getButtonContent = () => {
    if (state.isBooked && state.bookingStatus !== 'cancelled') {
      return (
        <RoughNotationText
          type="box"
          color="#AFACFB"
          strokeWidth={2}
          animationDelay={100}
          disabled={!state.allowRoughAnimations || !state.roughAnimationsReady || state.bookingJustCompleted}
          trigger={state.annotationTrigger}
        >
          Booking Confirmed!
        </RoughNotationText>
      );
    }

    if (state.loading) {
      return (
        <div className="flex items-center gap-2">
          <LoadingSpinner size={20} color="#4A7E74" />
          <span>Hold on...</span>
        </div>
      );
    }

    return getButtonText(
      state.isBooked,
      state.bookingStatus,
      state.loading,
      state.isBookable,
      state.eventStatus,
      user,
      state.bookableReason
    );
  };

  // Early returns for special states
  if (!event || !event.id) {
    return null;
  }

  // Container styling based on booking status
  const getContainerClasses = () => {
    let baseClasses = "bg-white overflow-hidden transition-all duration-700 ease-in-out";

    if (shouldShowBookedState) {
      // Apply reduced opacity and saturation for booked events
      baseClasses += " opacity-60 saturate-50 grayscale-[0.2]";
    }

    return baseClasses;
  };

  // Render the main event card component
  const eventCardComponent = (
    <motion.div
      ref={state.cardRef}
      className={getContainerClasses()}
      // CONDITIONAL ANIMATION - Only animate on desktop
      initial={shouldAnimate ? "hidden" : { opacity: shouldShowBookedState ? 0.6 : 1 }}
      animate={shouldAnimate ? undefined : {
        opacity: shouldShowBookedState ? 0.6 : 1,
        filter: shouldShowBookedState ? "saturate(0.5) grayscale(0.2)" : "saturate(1) grayscale(0)"
      }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      variants={shouldAnimate ? containerVariants : undefined}
      whileInView={shouldAnimate ? "visible" : undefined}
      viewport={shouldAnimate ? { once: true, amount: 0.3 } : undefined}
    >

      {/* Desktop Layout */}
      <EventCardDesktopLayout
        event={event}
        index={index}
        isImageLeft={isImageLeft}
        shouldAnimate={state.shouldAnimate}
        imageVariants={imageVariants}
        contentVariants={contentVariants}
        contentRef={state.contentRef}
        showFullDescription={state.showFullDescription}
        setShowFullDescription={state.setShowFullDescription}
        contentHeight={state.contentHeight}
        handleImageError={handlers.handleImageError}
        imageError={state.imageError}
        roughAnimationsReady={state.roughAnimationsReady}
        allowRoughAnimations={state.allowRoughAnimations}
        annotationTrigger={state.annotationTrigger}
        authError={state.authError}
        bookingStatus={state.bookingStatus}
        eventStatus={state.eventStatus}
        isBookable={state.isBookable}
        isFullyBooked={isFullyBooked}
        isClosedForBooking={isClosedForBooking}
        getButtonContent={getButtonContent}
        getButtonText={() => getButtonText(
          state.isBooked,
          state.bookingStatus,
          state.loading,
          state.isBookable,
          state.eventStatus,
          user,
          state.bookableReason
        )}
        isInteractiveButton={isInteractiveButton}
        handleBookEvent={handlers.handleBookEvent}
        isBooked={state.isBooked}
        loading={state.loading}
        shouldShowBookedState={shouldShowBookedState}
      />

      {/* Mobile Layout */}
      <EventCardMobileLayout
        event={event}
        index={index}
        shouldAnimate={state.shouldAnimate}
        mobileVariants={mobileVariants}
        cardRef={state.cardRef}
        contentRef={state.contentRef}
        showFullDescription={state.showFullDescription}
        setShowFullDescription={state.setShowFullDescription}
        handleImageError={handlers.handleImageError}
        imageError={state.imageError}
        roughAnimationsReady={state.roughAnimationsReady}
        allowRoughAnimations={state.allowRoughAnimations}
        annotationTrigger={state.annotationTrigger}
        authError={state.authError}
        bookingStatus={state.bookingStatus}
        eventStatus={state.eventStatus}
        isBookable={state.isBookable}
        isFullyBooked={isFullyBooked}
        isClosedForBooking={isClosedForBooking}
        getButtonContent={getButtonContent}
        getButtonText={() => getButtonText(
          state.isBooked,
          state.bookingStatus,
          state.loading,
          state.isBookable,
          state.eventStatus,
          user,
          state.bookableReason
        )}
        isInteractiveButton={isInteractiveButton}
        handleBookEvent={handlers.handleBookEvent}
        isBooked={state.isBooked}
        loading={state.loading}
        shouldShowBookedState={shouldShowBookedState}
      />
    </motion.div>
  );

  return (
    <>
      {/* Main Event Card */}
      {eventCardComponent}

      {/* Booking Form Modal */}
      {state.showBookingForm && (
        <BookingForm
          onSubmit={handlers.handleFormSubmit}
          onCancel={handlers.handleCancelForm}
          loading={state.loading}
          isFirstTime={state.isFirstTimeBooking}
          existingData={state.existingUserData}
          event={{
            ...event,
            paymentAmount: state.applicablePrice,
            userMembershipStatus: state.userMembershipStatus
          }}
        />
      )}

      {/* Payment Modal */}
      {state.showPaymentModal && (
        <PaymentModal
          isOpen={state.showPaymentModal}
          onClose={handlers.handlePaymentCancel}
          event={{
            ...event,
            paymentAmount: state.applicablePrice
          }}
          userData={state.bookingFormData}
          onPaymentSuccess={handlers.handlePaymentSuccess}
          onPaymentCancel={handlers.handlePaymentCancel}
        />
      )}

      {/* Celebratory Toast */}
      <CelebratoryToast
        isVisible={showCelebration}
        onComplete={handlers.handleCelebrationComplete}
        message={celebrationMessage}
      />
    </>
  );
}

export default EventCard;