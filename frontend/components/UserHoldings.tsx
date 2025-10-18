import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const UserHoldings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your $DECH Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">1,234 DECH</p>
      </CardContent>
    </Card>
  );
};

export default UserHoldings;
