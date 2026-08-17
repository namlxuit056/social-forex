import { Activity } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getMt5AccountSnapshot } from "@/lib/mt5/account-snapshot";
import { isMt5LiveRedisEnabled } from "@/lib/mt5/live-redis";
import { PositionsClient } from "@/components/mt5/positions-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return { title: "Positions · MT5", description: "Manage your live MT5 positions and pending orders." };
}

export default async function PositionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const snapshot = await getMt5AccountSnapshot(session.user.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Positions</h1>
          <p className="text-sm text-muted-foreground">Live MT5 positions &amp; pending orders</p>
        </div>
      </div>

      {!snapshot ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-muted-foreground">No MT5 connection found.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up a bridge token in the{" "}
            <Link href="/mt5" className="underline underline-offset-2">MT5 Bridge</Link> page.
          </p>
        </div>
      ) : (
        <PositionsClient
          initialAccount={snapshot.account}
          initialPositions={snapshot.positions}
          initialOrders={snapshot.orders}
          initialHistory={snapshot.history}
          liveEnabled={isMt5LiveRedisEnabled()}
        />
      )}
    </div>
  );
}
