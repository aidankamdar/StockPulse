import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your portfolio
        </p>
      </div>

      {/* Portfolio summary cards will go here */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PlaceholderCard title="Total Value" value="--" />
        <PlaceholderCard title="Day Change" value="--" />
        <PlaceholderCard title="Total P&L" value="--" />
        <PlaceholderCard title="Positions" value="--" />
      </div>

      {/* Positions table will go here */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Positions</h2>
        <p className="text-sm text-muted-foreground">
          Connect your Robinhood account or add trades manually to see your positions.
        </p>
      </div>
    </div>
  );
}

function PlaceholderCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
