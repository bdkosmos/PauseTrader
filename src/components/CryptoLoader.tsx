export function CryptoLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6 animate-pulse"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 bg-slate-700 rounded w-32" />
                <div className="h-4 bg-slate-700 rounded w-16" />
              </div>
              <div className="h-8 bg-slate-700 rounded w-20" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded w-20" />
              <div className="h-8 bg-slate-700 rounded w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}