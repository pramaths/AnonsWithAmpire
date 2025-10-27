'use client';

import { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ChargePoint } from '@/types';
import dummyData from '../app/dummy_data.json';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';


type ActiveSession = {
  sessionId: string;
  energyUsed: number;
  chargerCode: string;
  pricePerPoint: string;
  startTime: number;
  elapsedTime: number;
  pointsEarned: number;
};

export const MapComponent = () => {
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<ChargePoint | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const { publicKey, sendTransaction } = useWallet();

  useEffect(() => {
    const fetchChargePoints = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/charge_points`);
        if (!response.ok) {
          throw new Error('Failed to fetch charge points');
        }
        const data = await response.json();
        setChargePoints(data.charge_points);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };

    fetchChargePoints();
  }, []);

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleStartCharging = async (charger: ChargePoint) => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const startPromise = fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driverPublicKey: publicKey.toBase58(),
        chargerCode: charger.code
      }),
    });

    toast.promise(startPromise, {
      loading: 'Starting session...',
      success: async (response) => {
        if (response.status === 409) {
          const { transaction: serializedTx, message } = await response.json();
          toast.info(message);
          
          const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
          const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, 'confirmed');
          
          const signPromise = sendTransaction(tx, connection)
            .then(sig => connection.confirmTransaction(sig, 'confirmed'))
            .then(() => {
                // Retry starting the session now that the driver is registered
                handleStartCharging(charger);
            });
            
            return "Please approve the registration in your wallet. Retrying session start...";
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start session');
        }

        const { sessionId, pricePerPoint } = await response.json();
        
        const initialSessionState = {
          sessionId, 
          energyUsed: 0, 
          chargerCode: charger.code, 
          pricePerPoint, 
          startTime: Date.now(),
          elapsedTime: 0,
          pointsEarned: 0,
        };
        setActiveSession(initialSessionState);
        localStorage.setItem('activeSessionId', sessionId);

        const intervalId = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/status`);
            if (statusResponse.ok) {
              const sessionData = await statusResponse.json();
              setActiveSession(prev => prev ? { ...prev, ...sessionData } : null);
            }
          } catch (error) {
            console.error('Failed to fetch session status:', error);
          }
        }, 2000);
        setPollingIntervalId(intervalId);
        
        return "Session started successfully!";
      },
      error: (err) => `Error: ${err.message}`,
    });
  };

  const handleStopCharging = async () => {
    if (!publicKey || !activeSession) return;

    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    const stopPromise = fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: activeSession.sessionId,
        charger_code: activeSession.chargerCode,
      }),
    });
    
    toast.promise(stopPromise, {
        loading: 'Preparing transaction...',
        success: async (response) => {
            if (!response.ok) {
                throw new Error('Failed to create transaction');
            }
            const { transaction: serializedTx } = await response.json();
            const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
            
            const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, 'confirmed');
            
            const signPromise = sendTransaction(tx, connection)
                .then(sig => connection.confirmTransaction(sig, 'confirmed'));

            toast.promise(signPromise, {
                loading: 'Please approve the transaction in your wallet...',
                success: () => {
                    setActiveSession(null);
                    return 'Session stopped and recorded successfully!';
                },
                error: 'Transaction failed or was rejected.'
            });
            
            return 'Transaction created. Please sign in your wallet.';
        },
        error: (err) => `Error: ${err.message}`,
    });
  };

  const getPinColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#00ff00';
      case 'occupied':
        return '#ff9500';
      case 'maintenance':
      case 'offline':
        return '#808080';
      default:
        return '#0000ff';
    }
  };

  return (
    <div className="relative w-full h-full">
      <Map
          initialViewState={{
            longitude: 77.5946,
            latitude: 12.9716,
            zoom: 5
          }}
          style={{ width: '100vw', height: '100vh' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken="pk.eyJ1IjoicHJhbWF0aHMxMSIsImEiOiJjbWdwajU2NWcwb2FyMmpxNDAzN3AwdHF4In0.GL0MDtz32PYXGNfs571Luw"
        >
          {chargePoints.map((charger) => (
            <Marker
              key={charger.code}
              longitude={charger.location.longitude}
              latitude={charger.location.latitude}
            >
              {charger.status === 'active' ? (
                <div
                  className="pulsing-dot"
                  onClick={() => setSelectedCharger(charger)}
                />
              ) : (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: getPinColor(charger.status),
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: '2px solid white'
                  }}
                  onClick={() => setSelectedCharger(charger)}
                />
              )}
            </Marker>
          ))}

          {selectedCharger && (
            <Popup
              longitude={selectedCharger.location.longitude}
              latitude={selectedCharger.location.latitude}
              onClose={() => setSelectedCharger(null)}
              closeOnClick={false}
            >
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl border border-blue-500/30 shadow-2xl min-w-[280px] relative">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {selectedCharger.name}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Power</span>
                    <span className="text-white font-semibold">{selectedCharger.connectors[0].power_kw} kW</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Rate</span>
                    <span className="text-lime-400 font-semibold">₹{selectedCharger.pricing.energy_based.rate}/kWh</span>
                  </div>
                  {activeSession && activeSession.chargerCode === selectedCharger.code ? (
                    <>
                      <div className="pt-3 space-y-2">
                        <Progress value={(activeSession.elapsedTime / (60 * 1000)) * 100} className="w-full" />
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>TIME</span>
                          <span>{formatElapsedTime(activeSession.elapsedTime)}</span>
                        </div>
                        <div className="text-sm">
                                    <p>⚡️ Energy Delivered: {activeSession.energyUsed.toFixed(2)} kWh</p>
                                    <p>💨 CO2 Saved: {activeSession.pointsEarned.toFixed(2)} kg</p>
                                    <p>💰 Points Earned: {activeSession.pointsEarned.toFixed(2)} DECH</p>
                                </div>
                                <Button
                                    onClick={handleStopCharging}
                                    className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-bold"
                                >
                                    Stop Charging
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Button onClick={() => handleStartCharging(selectedCharger as ChargePoint)} className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold">
                            Start Charging
                        </Button>
                    )}
                </div>
                <button
                    onClick={() => setSelectedCharger(null)}
                    className="absolute top-2 right-2 p-1 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </Popup>
    )}
</Map>
</div>
);
};

export default MapComponent;
