'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@clawtrade/ui';
import { useTrades } from '../../hooks/useTrades';

type TradeStatus = 'ALL' | 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export default function TradesPage() {
  const { trades, isLoading, refetch } = useTrades();
  const [statusFilter, setStatusFilter] = useState<TradeStatus>('ALL');

  const filteredTrades = statusFilter === 'ALL'
    ? trades
    : trades.filter((trade) => trade.status === statusFilter);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'PENDING':
      case 'EXECUTING':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Trade History</h1>
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['ALL', 'PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as TradeStatus)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-800 text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Trades Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === 'ALL' ? 'All Trades' : `${statusFilter} Trades`}
              <span className="ml-2 text-gray-400 text-sm">
                ({filteredTrades.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-gray-400 text-center py-12">Loading...</div>
            ) : filteredTrades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Type</th>
                      <th className="text-left py-3 px-4 text-gray-400">Input</th>
                      <th className="text-left py-3 px-4 text-gray-400">Output</th>
                      <th className="text-right py-3 px-4 text-gray-400">Input Amount</th>
                      <th className="text-right py-3 px-4 text-gray-400">Output Amount</th>
                      <th className="text-right py-3 px-4 text-gray-400">Price</th>
                      <th className="text-right py-3 px-4 text-gray-400">P&L</th>
                      <th className="text-center py-3 px-4 text-gray-400">Status</th>
                      <th className="text-right py-3 px-4 text-gray-400">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((trade) => (
                      <tr key={trade.id} className="border-b border-gray-800">
                        <td className="py-4 px-4">
                          <Badge
                            variant={trade.type === 'BUY' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {trade.type}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-white text-sm">
                          {trade.inputMint.slice(0, 8)}...
                        </td>
                        <td className="py-4 px-4 text-white text-sm">
                          {trade.outputMint.slice(0, 8)}...
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          {parseFloat(trade.inputAmount).toFixed(4)}
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          {parseFloat(trade.outputAmount).toFixed(4)}
                        </td>
                        <td className="text-right py-4 px-4 text-gray-400">
                          ${trade.price.toFixed(6)}
                        </td>
                        <td className={`text-right py-4 px-4 ${trade.pnl && trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                        </td>
                        <td className="text-center py-4 px-4">
                          <Badge
                            variant={getStatusVariant(trade.status)}
                            size="sm"
                          >
                            {trade.status}
                          </Badge>
                        </td>
                        <td className="text-right py-4 px-4 text-gray-400 text-sm">
                          {new Date(trade.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-12">
                No trades found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
