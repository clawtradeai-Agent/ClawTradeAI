'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@clawtrade/ui';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useTrades } from '../../hooks/useTrades';
import { AgentStatus } from '../../components/AgentStatus';
import { RecentTrades } from '../../components/RecentTrades';
import { PortfolioChart } from '../../components/PortfolioChart';

export default function Dashboard() {
  const { portfolio, summary, isLoading } = usePortfolio();
  const { trades } = useTrades();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${isLoading ? '...' : summary?.totalValue.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary?.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${isLoading ? '...' : summary?.totalPnl.toFixed(2) || '0.00'}
              </div>
              <div className={`text-sm ${(Number(summary?.totalPnlPercent) || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {isLoading ? '...' : `${summary?.totalPnlPercent || 0}%`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {isLoading ? '...' : summary?.positions || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {trades?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioChart />
              </CardContent>
            </Card>
          </div>

          {/* Agent Status */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Agent Status</CardTitle>
              </CardHeader>
              <CardContent>
                <AgentStatus />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTrades />
            </CardContent>
          </Card>
        </div>

        {/* Holdings */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-gray-400 text-center py-8">Loading...</div>
              ) : portfolio && portfolio.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400">Token</th>
                        <th className="text-right py-3 px-4 text-gray-400">Balance</th>
                        <th className="text-right py-3 px-4 text-gray-400">Value</th>
                        <th className="text-right py-3 px-4 text-gray-400">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.map((position) => (
                        <tr key={position.tokenMint} className="border-b border-gray-800">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{position.tokenSymbol}</span>
                              <span className="text-gray-500 text-sm">{position.tokenName}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 text-white">
                            {position.balance.toFixed(4)}
                          </td>
                          <td className="text-right py-3 px-4 text-white">
                            ${position.currentValue.toFixed(2)}
                          </td>
                          <td className={`text-right py-3 px-4 ${Number(position.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            <div>${position.pnl.toFixed(2)}</div>
                            <div className="text-sm">{position.pnlPercent.toFixed(2)}%</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No holdings yet. Start trading to build your portfolio.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
