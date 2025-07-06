'use client';

import { useEffect } from 'react';

export default function ConfigLoader() {
  useEffect(() => {
    // config.jsが既に読み込まれているかチェック
    if (typeof window !== 'undefined' && !window.APP_CONFIG) {
      const script = document.createElement('script');
      script.src = '/config.js';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  return null;
}