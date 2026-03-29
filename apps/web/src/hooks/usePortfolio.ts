'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

interface PortfolioPosition {
  id: string;
  userId: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  balance: number;
  averagePrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: string;
  positions: number;
}

interface PortfolioResponse {
  portfolio: PortfolioPosition[];
  summary: PortfolioSummary;
}

export function usePortfolio() {
  const { data, isLoading, error, refetch } = useQuery<PortfolioResponse>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/portfolio`);
      return response.data;
    },
    retry: false,
  });

  return {
    portfolio: data?.portfolio || [],
    summary: data?.summary,
    isLoading,
    error,
    refetch,
  };
}
