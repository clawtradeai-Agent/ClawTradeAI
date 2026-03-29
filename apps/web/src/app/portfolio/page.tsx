'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@clawtrade/ui';
import { usePortfolio } from '../../hooks/usePortfolio';

export default function PortfolioPage() {
  const { portfolio, summary, isLoading } = usePortfolio();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Portfolio</h1>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${isLoading ? '...' : summary?.totalValue.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${Number(summary?.totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${isLoading ? '...' : summary?.totalPnl.toFixed(2) || '0.00'}
              </div>
              <div className={`text-sm mt-1 ${Number(summary?.totalPnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {isLoading ? '...' : `${summary?.totalPnlPercent || 0}%`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm">Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {isLoading ? '...' : summary?.positions || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-gray-400 text-center py-12">Loading...</div>
            ) : portfolio && portfolio.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Token</th>
                      <th className="text-right py-3 px-4 text-gray-400">Balance</th>
                      <th className="text-right py-3 px-4 text-gray-400">Avg Price</th>
                      <th className="text-right py-3 px-4 text-gray-400">Current Price</th>
                      <th className="text-right py-3 px-4 text-gray-400">Value</th>
                      <th className="text-right py-3 px-4 text-gray-400">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((position) => (
                      <tr key={position.tokenMint} className="border-b border-gray-800">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-white">{position.tokenSymbol}</div>
                            <div className="text-sm text-gray-500">{position.tokenName}</div>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          {position.balance.toFixed(6)}
                        </td>
                        <td className="text-right py-4 px-4 text-gray-400">
                          ${position.averagePrice.toFixed(6)}
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          ${(position.currentValue / position.balance).toFixed(6)}
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          ${position.currentValue.toFixed(2)}
                        </td>
                        <td className={`text-right py-4 px-4 ${Number(position.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <div>${position.pnl.toFixed(2)}</div>
                          <div className="text-sm">{position.pnlPercent.toFixed(2)}%</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-12">
                No holdings yet. Start trading to build your portfolio.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
