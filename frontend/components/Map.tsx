'use client';

import { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ChargePoint } from '@/types';
import dummyData from '../app/dummy_data.json';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

type ActiveSession = {
  sessionId: string;
  energyUsed: number;
  chargerCode: string;
  pricePerPoint: string;
};

const MapComponent = () => {
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<ChargePoint | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const { publicKey, sendTransaction } = useWallet();

  useEffect(() => {
    setChargePoints(dummyData.charge_points);
  }, []);

  const handleStartCharging = async (charger: ChargePoint) => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          driverPublicKey: publicKey.toBase58(),
          chargerCode: charger.code 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start session');
      }

      const { sessionId, pricePerPoint } = await response.json();
      
      setActiveSession({ sessionId, energyUsed: 0, chargerCode: charger.code, pricePerPoint });

      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await fetch(`http://localhost:3001/api/sessions/${sessionId}/status`);
          if (statusResponse.ok) {
            const { energyUsed } = await statusResponse.json();
            setActiveSession(prev => prev ? { ...prev, energyUsed } : null);
          }
        } catch (error) {
          console.error('Failed to fetch session status:', error);
        }
      }, 2000);
      setPollingIntervalId(intervalId);

    } catch (error) {
      console.error('Error starting session:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleStopCharging = async () => {
    if (!publicKey || !activeSession) return;

    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    try {
      const response = await fetch('http://localhost:3001/api/sessions/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          charger_code: activeSession.chargerCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop session');
      }

      const { transaction: serializedTx } = await response.json();
      const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
      
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
      const signature = await sendTransaction(tx, connection);
      
      await connection.confirmTransaction(signature, 'confirmed');

      alert(`Session stopped! Transaction: ${signature}`);
      
    } catch (error) {
      console.error('Error stopping session:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setActiveSession(null);
    }
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
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl border border-blue-500/30 shadow-2xl min-w-[280px]">
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
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedCharger.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  selectedCharger.status === 'occupied' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedCharger.status.toUpperCase()}
                </span>
              </div>
              {activeSession && activeSession.chargerCode === selectedCharger.code && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Energy Delivered</span>
                  <span className="text-white font-semibold">{activeSession.energyUsed.toFixed(2)} kWh</span>
                </div>
              )}
              {activeSession && activeSession.chargerCode === selectedCharger.code && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Rate per Point</span>
                  <span className="text-lime-400 font-semibold">{activeSession.pricePerPoint} lamports</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                if (activeSession && activeSession.chargerCode === selectedCharger.code) {
                  handleStopCharging();
                } else {
                  handleStartCharging(selectedCharger);
                }
              }}
              disabled={!!activeSession && activeSession.chargerCode !== selectedCharger.code}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeSession && activeSession.chargerCode === selectedCharger.code 
                ? '🔌 Stop Charging' 
                : '⚡ Start Charging'
              }
            </button>
          </div>
        </Popup>
      )}
    </Map>
  );
};

export default MapComponent;
