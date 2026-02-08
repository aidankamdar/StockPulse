import { PlaidConnectCard } from "@/components/settings/plaid-connect-card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Account and investment connection settings
        </p>
      </div>

      {/* Plaid Investment Connection */}
      <PlaidConnectCard />

      {/* Manual Entry Note */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Manual Trade Entry</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You can always add trades manually from the Dashboard or Transactions
          page, even if you have a connected investment account.
        </p>
      </div>
    </div>
  );
}
