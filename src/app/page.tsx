import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Bot, Globe } from "lucide-react";

export default async function HomePage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">StockPulse</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Track your portfolio.
          <br />
          <span className="text-primary">Powered by AI.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Connect your Robinhood account, get AI-powered insights on your
          investments, and share your progress with friends.
        </p>
        <div className="mt-8 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Get started free</Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <BarChart3 className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-semibold">Live Portfolio</h3>
            <p className="text-sm text-muted-foreground">
              Real-time positions synced from Robinhood with P&L tracking
            </p>
          </div>
          <div className="space-y-2">
            <Bot className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-semibold">AI Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Claude-powered stock research, portfolio analysis, and trade ideas
            </p>
          </div>
          <div className="space-y-2">
            <Globe className="mx-auto h-8 w-8 text-primary" />
            <h3 className="font-semibold">Showcase</h3>
            <p className="text-sm text-muted-foreground">
              Share your portfolio with friends via a public profile page
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
