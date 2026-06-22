import { useState, useEffect } from 'react';

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'toncoin'];

const CRYPTO_META = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin' },
];

export function useCryptoData() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setError(null);
      const ids = CRYPTO_IDS.join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }

      const data = await response.json();

      const formatted: CryptoPrice[] = CRYPTO_META.map((crypto) => {
        const info = data[crypto.id];
        if (!info?.usd) return null;
        return {
          id: crypto.id,
          symbol: crypto.symbol,
          name: crypto.name,
          price: info.usd,
          change24h: info.usd_24h_change ?? 0,
          marketCap: info.usd_market_cap ?? 0,
          volume24h: info.usd_24h_vol ?? 0,
        };
      }).filter((c): c is CryptoPrice => c !== null);

      setPrices(formatted);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching crypto prices:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return { prices, loading, error, refetch: fetchPrices };
}