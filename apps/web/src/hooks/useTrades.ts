'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

interface Trade {
  id: string;
  userId: string;
  walletId: string;
  type: 'BUY' | 'SELL';
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  price: number;
  slippageBps: number;
  signature: string | null;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  pnl: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TradesResponse {
  trades: Trade[];
}

export function useTrades() {
  const { data, isLoading, error, refetch } = useQuery<TradesResponse>({
    queryKey: ['trades'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/trading/history`);
      return response.data;
    },
    retry: false,
  });

  return {
    trades: data?.trades || [],
    isLoading,
    error,
    refetch,
  };
}
