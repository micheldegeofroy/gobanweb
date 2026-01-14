'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;

      // Check for tablets (iPad, Android tablets, etc.)
      const isTablet =
        /ipad/.test(userAgent) ||
        (/android/.test(userAgent) && !/mobile/.test(userAgent)) ||
        (width >= 768 && width <= 1024 && 'ontouchstart' in window);

      // Check for mobile phones
      const isMobile =
        /iphone|ipod|android.*mobile|windows phone|blackberry/.test(userAgent) ||
        (width < 768 && 'ontouchstart' in window);

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
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceType;
}
