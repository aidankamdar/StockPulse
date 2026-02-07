export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground">Stocks you&apos;re tracking</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Your watchlist will appear here.
        </p>
      </div>
    </div>
  );
}
