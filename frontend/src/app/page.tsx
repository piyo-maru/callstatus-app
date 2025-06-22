'use client';

import AuthGuard from './components/AuthGuard';
import FullMainApp from './components/FullMainApp';

export default function HomePage() {
  return (
    <AuthGuard>
      <FullMainApp />
    </AuthGuard>
  );
}