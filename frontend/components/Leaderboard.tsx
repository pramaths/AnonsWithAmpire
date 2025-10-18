import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const dummyDrivers = [
  { id: 1, name: 'Driver A', points: 5432 },
  { id: 2, name: 'Driver B', points: 4876 },
  { id: 3, name: 'Driver C', points: 4501 },
  { id: 4, name: 'Driver D', points: 3987 },
  { id: 5, name: 'Driver E', points: 3210 },
];

const Leaderboard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard of Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {dummyDrivers.map((driver, index) => (
            <li key={driver.id} className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-bold mr-4">{index + 1}</span>
                <span>{driver.name}</span>
              </div>
              <span className="font-semibold">{driver.points} pts</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
