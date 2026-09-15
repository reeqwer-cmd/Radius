import { useState, useEffect } from 'react';
import { PyWebViewAPI } from '../types/api';

export function usePyWebView() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.pywebview?.api) {
      setIsReady(true);
      return;
    }

    const handler = () => setIsReady(true);
    window.addEventListener('pywebviewready', handler);
    return () => window.removeEventListener('pywebviewready', handler);
  }, []);

  return {
    isReady,
    api: window.pywebview?.api as PyWebViewAPI | undefined
  };
}