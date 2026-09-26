import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Cầu nối nhận diện thiết bị chuyên biệt (CARE MATCH Device Bridge)
 * Tự động phân loại PC vs Điện thoại thông minh (Mobile/Tablet)
 * Cập nhật data-device và data-touch trên <html> để CSS tối ưu riêng biệt
 * mà KHÔNG làm ảnh hưởng đến giao diện PC đã hoàn thiện.
 */
export function useDeviceDetect(): DeviceInfo {
  const getDeviceInfo = (): DeviceInfo => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: 1280,
        screenHeight: 800,
        isTouch: false,
        orientation: 'landscape'
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // User agent fallback để nhận diện chính xác các dòng điện thoại iOS / Android
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isTabletUA = /ipad|tablet|(android(?!.*mobile))/i.test(ua);

    const isMobile = width < 768 || (isMobileUA && width < 900);
    const isTablet = !isMobile && (width < 1024 || isTabletUA);
    const isDesktop = !isMobile && !isTablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      screenWidth: width,
      screenHeight: height,
      isTouch,
      orientation: width < height ? 'portrait' : 'landscape'
    };
  };

  const [device, setDevice] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const handleResize = () => {
      const info = getDeviceInfo();
      setDevice(info);

      // Cầu nối nhúng thẻ thuộc tính HTML để CSS nhận diện và tự điều chỉnh
      const root = document.documentElement;
      const deviceClass = info.isMobile ? 'mobile' : info.isTablet ? 'tablet' : 'desktop';
      root.setAttribute('data-device', deviceClass);
      root.setAttribute('data-touch', info.isTouch ? 'true' : 'false');
      root.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
      root.classList.add(`device-${deviceClass}`);
    };

    // Chạy ngay khi mount
    handleResize();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return device;
}
