'use client';

import FullMainApp from './components/FullMainApp';
import AuthGuard from './components/AuthGuard';

export default function HomePage() {
  return (
    <AuthGuard>
      <FullMainApp />
    </AuthGuard>
  );
}