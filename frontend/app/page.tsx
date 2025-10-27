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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div className="md:col-span-2">
          <MapComponent />
        </div>
      </div>
    </main>
  );
}
