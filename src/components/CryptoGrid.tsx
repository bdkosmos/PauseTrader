import { CryptoCard } from './CryptoCard';
import { CryptoLoader } from './CryptoLoader';
import { useCryptoData } from '../hooks/useCryptoData';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';

export function CryptoGrid() {
  const { prices, loading, error, refetch } = useCryptoData();

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button
          onClick={refetch}
          variant="outline"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Cryptocurrency Prices</h2>
        <Button
          onClick={refetch}
          size="sm"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading && prices.length === 0 ? (
        <CryptoLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {prices.map((crypto) => (
            <CryptoCard key={crypto.id} crypto={crypto} />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 mt-6">
        Updates every 30 seconds • Data from CoinGecko API
      </p>
    </div>
  );
}