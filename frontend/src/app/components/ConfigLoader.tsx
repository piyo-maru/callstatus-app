'use client';

import { useEffect } from 'react';

export default function ConfigLoader() {
  useEffect(() => {
    // config.jsを動的にロード
    const script = document.createElement('script');
    script.src = '/config.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // クリーンアップ
      const existingScript = document.querySelector('script[src="/config.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}