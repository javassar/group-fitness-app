// Platform detection helpers for iOS, standalone Home Screen mode, and Web Push support.

export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  // Modern iPads running iPadOS report 'MacIntel' with touch points
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // Standard CSS media query for installed web apps
  const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari legacy fullscreen standalone flag
  const nav = window.navigator as { standalone?: boolean };
  return isMediaStandalone || nav.standalone === true;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
