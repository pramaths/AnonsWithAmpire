"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface BuyPointsModalProps {
  driver: {
    driver: string;
    pricePerPoint: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function BuyPointsModal({ driver, onClose, onSuccess }: BuyPointsModalProps) {
  const [amount, setAmount] = useState("");
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const pricePerPointSOL = parseFloat(driver.pricePerPoint) / 1000;
  
  const totalCost = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    return (parseFloat(amount) * pricePerPointSOL)/1000000;
  }, [amount, pricePerPointSOL]);

  const handleBuy = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const toastId = toast.loading("Creating purchase transaction...");

    try {
      // The backend now creates a transaction that handles both the SOL
      // payment and the token transfer. The frontend just needs to sign it.
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/drivers/buy-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerPublicKey: publicKey.toBase58(),
          driverPublicKey: driver.driver,
          amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to create transaction.");
      }

      const { transaction } = await response.json();
      
      const tx = Transaction.from(Buffer.from(transaction, 'base64'));
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success("Purchase successful!", {
        id: toastId,
        description: `Transaction: ${signature.substring(0, 10)}...`
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("Purchase failed. See console for details.", { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="bg-slate-900 border-slate-700 text-white w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lime-400">Buy DECH from Driver</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Price per DECH:</span>
                <span className="text-yellow-400 font-mono">{pricePerPointSOL.toFixed(6)} SOL</span>
              </div>
            </div>
            <div>
              <Label htmlFor="amount">Amount of DECH to buy</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 100"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Cost:</span>
                  <span className="text-lime-400 font-mono flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {totalCost.toFixed(6)} SOL
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
              <Button onClick={handleBuy} className="bg-lime-500 hover:bg-lime-600 text-slate-900">
                Buy Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
