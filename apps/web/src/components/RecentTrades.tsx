'use client';

import { Badge } from '@clawtrade/ui';
import { useTrades } from '@/hooks/useTrades';

interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  status: string;
  createdAt: string;
}

export function RecentTrades() {
  const { trades, isLoading } = useTrades();

  if (isLoading) {
    return <div className="text-gray-400 text-center py-8">Loading...</div>;
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No trades yet. Start trading to see your history.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400 text-sm">Type</th>
            <th className="text-left py-3 px-4 text-gray-400 text-sm">Token</th>
            <th className="text-right py-3 px-4 text-gray-400 text-sm">Input</th>
            <th className="text-right py-3 px-4 text-gray-400 text-sm">Output</th>
            <th className="text-right py-3 px-4 text-gray-400 text-sm">Status</th>
            <th className="text-right py-3 px-4 text-gray-400 text-sm">Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 5).map((trade: Trade) => (
            <tr key={trade.id} className="border-b border-gray-800">
              <td className="py-3 px-4">
                <Badge
                  variant={trade.type === 'BUY' ? 'success' : 'danger'}
                  size="sm"
                >
                  {trade.type}
                </Badge>
              </td>
              <td className="py-3 px-4 text-white text-sm">
                {trade.outputMint.slice(0, 8)}...
              </td>
              <td className="text-right py-3 px-4 text-white text-sm">
                {parseFloat(trade.inputAmount).toFixed(4)}
              </td>
              <td className="text-right py-3 px-4 text-white text-sm">
                {parseFloat(trade.outputAmount).toFixed(4)}
              </td>
              <td className="text-right py-3 px-4">
                <Badge
                  variant={
                    trade.status === 'COMPLETED'
                      ? 'success'
                      : trade.status === 'FAILED'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                >
                  {trade.status}
                </Badge>
              </td>
              <td className="text-right py-3 px-4 text-gray-400 text-sm">
                {new Date(trade.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
