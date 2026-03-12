import { AnalyticsClient } from "./analytics-client";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Charts and performance metrics
        </p>
      </div>
      <AnalyticsClient />
    </div>
  );
}
