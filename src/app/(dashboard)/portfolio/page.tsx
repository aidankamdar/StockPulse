export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">All your positions</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Positions will appear here once you sync your Robinhood account or add trades.
        </p>
      </div>
    </div>
  );
}
