'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // iPadOS 13+ reports as Mac in user agent, detect via touch + screen size
      const isIPadOS = /macintosh/.test(userAgent) && hasTouch && width >= 768;

      // Check for tablets (iPad, iPadOS 13+, Android tablets, etc.)
      const isTablet =
        /ipad/.test(userAgent) ||
        isIPadOS ||
        (/android/.test(userAgent) && !/mobile/.test(userAgent)) ||
        // Large touch screen but not ultra-wide (tablet-like aspect ratio)
        (width >= 768 && width <= 1366 && hasTouch && height / width > 0.5);

      // Check for mobile phones (iPhone, Android phones, etc.)
      const isMobile =
        /iphone|ipod/.test(userAgent) ||
        (/android/.test(userAgent) && /mobile/.test(userAgent)) ||
        /windows phone|blackberry/.test(userAgent) ||
        // Small touch screen
        (width < 768 && hasTouch);

      if (isTablet) {
        setDeviceType('tablet');
      } else if (isMobile) {
        setDeviceType('mobile');
      } else {
        setDeviceType('desktop');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return deviceType;
}
