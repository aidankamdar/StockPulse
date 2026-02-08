import { PortfolioClient } from "./portfolio-client";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">All your positions</p>
      </div>
      <PortfolioClient />
    </div>
  );
}
