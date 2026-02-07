import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  let displayName = "";
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    displayName = user?.user_metadata?.display_name ?? "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
          {displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your portfolio
        </p>
      </div>

      <DashboardClient />
    </div>
  );
}
