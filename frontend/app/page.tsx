'use client';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';

const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <Header />
      <MapComponent />
    </main>
  );
}
