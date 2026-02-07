import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/supabase/provision-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Provision user in Prisma DB (for OAuth / magic-link flows)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await provisionUser(user);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
