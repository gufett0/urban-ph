import { useEffect, useRef, useState } from 'react';
import { annotate } from 'rough-notation';

const RoughNotationText = ({
  children,
  type = 'highlight',
  color = '#8B5CF6',
  animate = true,
  animationDelay = 0,
  strokeWidth = 2,
  className = '',
  disabled = false,
  trigger, // New prop to force re-render
  ...props
}) => {
  const elementRef = useRef(null);
  const annotationRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prevTriggerRef = useRef(trigger);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(prev => prev !== newIsMobile ? newIsMobile : prev);
    };

    checkMobile();

    // Debounce per evitare troppi re-render durante il resize
    let timeoutId;
    const debouncedCheckMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };

    window.addEventListener('resize', debouncedCheckMobile);
    return () => {
      window.removeEventListener('resize', debouncedCheckMobile);
      clearTimeout(timeoutId);
    };
  }, []);

  // Get mobile-optimized settings
  const getMobileSettings = () => {
    if (!isMobile) {
      return {
        strokeWidth,
        padding: type === 'highlight' ? 4 : 4,
        animationDuration: 800
      };
    }

    // Mobile optimizations - much tighter annotations
    return {
      strokeWidth: Math.max(1, strokeWidth - 0.5), // Thinner strokes on mobile
      padding: type === 'highlight' ? 1 : 2, // Minimal padding on mobile for tight fit
      animationDuration: 600 // Faster animations on mobile
    };
  };



  useEffect(() => {
    const el = elementRef.current;
    // Clean up any previous annotation
    if (annotationRef.current) {
      try { annotationRef.current.remove(); } catch { }
      annotationRef.current = null;
    }

    // Bail if no element, disabled, or not triggered
    if (!el || disabled || !trigger) return;

    const settings = getMobileSettings();
    let raf1 = 0, raf2 = 0, showTimer = 0;

    // force layout
    void el.getBoundingClientRect();

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const ann = annotate(el, {
          type,
          color,
          strokeWidth: settings.strokeWidth,
          animate,
          animationDuration: settings.animationDuration,
          padding: settings.padding
        });
        annotationRef.current = ann;
        showTimer = window.setTimeout(() => {
          ann.show();
        }, animationDelay || 0);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(showTimer);
      if (annotationRef.current) {
        try { annotationRef.current.remove(); } catch { }
        annotationRef.current = null;
      }
    };
  }, [trigger, disabled, type, color, animate, animationDelay, strokeWidth, children, isMobile]);


  return (
    <span
      ref={elementRef}
      className={className}
      style={{
        display: isMobile ? 'inline' : undefined,
        maxWidth: isMobile ? 'fit-content' : undefined
      }}
      {...props}
    >
      {children}
    </span>
  );
};

export default RoughNotationText;