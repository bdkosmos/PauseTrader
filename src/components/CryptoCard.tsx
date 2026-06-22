import { CryptoPrice } from '../hooks/useCryptoData';
import { Card } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoCardProps {
  crypto: CryptoPrice;
}

export function CryptoCard({ crypto }: CryptoCardProps) {
  const isPositive = crypto.change24h >= 0;

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-6 hover:border-slate-600 transition-all">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{crypto.name}</h3>
            <p className="text-sm text-slate-400">{crypto.symbol}</p>
          </div>
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full ${
              isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}
              {crypto.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm text-slate-400">Price</p>
            <p className="text-3xl font-bold text-white">
              $
              {crypto.price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Market Cap</p>
              <p className="text-sm font-semibold text-slate-200">
                ${(crypto.marketCap / 1e9).toFixed(2)}B
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">24h Volume</p>
              <p className="text-sm font-semibold text-slate-200">
                ${(crypto.volume24h / 1e9).toFixed(2)}B
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}