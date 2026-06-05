import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

const BREAKPOINTS = {
  mobile: 480,
  tablet: 640,
  desktop: 768,
  wide: 1024,
};

export function useWindowSize() {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const { width } = useWindowSize();

  useEffect(() => {
    if (width < BREAKPOINTS.mobile) {
      setBreakpoint('mobile');
    } else if (width < BREAKPOINTS.tablet) {
      setBreakpoint('tablet');
    } else if (width < BREAKPOINTS.desktop) {
      setBreakpoint('desktop');
    } else {
      setBreakpoint('wide');
    }
  }, [width]);

  return breakpoint;
}

export function useIsMobile() {
  const { width } = useWindowSize();
  return width < BREAKPOINTS.desktop;
}

export function useIsSmallMobile() {
  const { width } = useWindowSize();
  return width < BREAKPOINTS.mobile;
}

export { BREAKPOINTS };