'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Driver {
    publicKey: string;
    account: {
        driver: string;
        totalEnergy: number;
        totalPoints: number;
        sessionCount: number;
        pointsBalance: number;
        pricePerPoint: number;
        active: boolean;
    };
}

const DriverMarketplace = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/drivers');
                const data = await response.json();
                setDrivers(data);
            } catch (error) {
                console.error('Failed to fetch drivers:', error);
            }
        };

        fetchDrivers();
    }, []);

  const totalDrivers = drivers.length;
  const bestPrice = drivers.length > 0
      ? Math.min(...drivers.map(d => d.account.pricePerPoint)) / 1_000_000
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Marketplace</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
          <span>Total Drivers: {totalDrivers}</span>
          <span>Best Price: ${bestPrice.toFixed(4)}/DECH</span>
        </div>
        <div className="space-y-4">
          {drivers.map(driver => (
            <div key={driver.publicKey} className="flex justify-between items-center p-2 rounded-md">
              <div>
                <p className="font-semibold">{driver.account.driver.substring(0, 10)}...</p>
                <p className="text-xs text-gray-500">{driver.account.pointsBalance} DECH available</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">${(driver.account.pricePerPoint / 1_000_000).toFixed(4)}/DECH</span>
                <Input type="number" placeholder="Amount" className="w-24 h-8" />
                <Button size="sm">Buy</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverMarketplace;
