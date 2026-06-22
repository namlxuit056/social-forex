"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Users, Video, ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Webinar = {
  id: string;
  title: string;
  description: string | null;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  scheduledAt: string;
  duration: number;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  host: { name: string | null; email: string | null; image: string | null };
  _count: { registrations: number };
  isRegistered: boolean;
};

type Props = {
  webinars: Webinar[];
  userId?: string;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  SCHEDULED: { color: "bg-blue-500/15 text-blue-500", label: "Upcoming" },
  LIVE: { color: "bg-red-500/15 text-red-500", label: "Live Now" },
  ENDED: { color: "bg-muted text-muted-foreground", label: "Ended" },
  CANCELLED: { color: "bg-muted text-muted-foreground", label: "Cancelled" },
};

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WebinarList({ webinars, userId }: Props) {
  const t = useTranslations("webinar");
  const [registering, setRegistering] = useState<string | null>(null);

  async function handleRegister(webinarId: string) {
    setRegistering(webinarId);
    try {
      const res = await fetch("/api/webinar/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // Silent fail
    } finally {
      setRegistering(null);
    }
  }

  if (webinars.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-12 text-center">
        <Video className="mx-auto mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("noWebinars")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {webinars.map((webinar) => {
        const status = statusConfig[webinar.status];
        const hostName = webinar.host.name ?? webinar.host.email ?? "—";
        const isLive = webinar.status === "LIVE";
        const isScheduled = webinar.status === "SCHEDULED";
        const isEnded = webinar.status === "ENDED";

        return (
          <Card
            key={webinar.id}
            className={cn(
              "border-border/60 bg-card/50 transition hover:border-primary/30",
              isLive && "border-red-500/30 bg-red-500/5",
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("text-[10px]", status.color)}>
                      {isLive && <span className="mr-1 size-1.5 animate-pulse rounded-full bg-red-500" />}
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {webinar.duration} min
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-base leading-tight">{webinar.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {webinar.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{webinar.description}</p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(webinar.scheduledAt, "vi")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {webinar._count.registrations} {t("registered")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{hostName}</span>
                <span>•</span>
                <span>{t("host")}</span>
              </div>

              <div className="flex gap-2 pt-1">
                {isLive && webinar.streamUrl && (
                  <a
                    href={webinar.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Video className="size-3.5" />
                    {t("joinNow")}
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {isScheduled && !webinar.isRegistered && userId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => void handleRegister(webinar.id)}
                    disabled={registering === webinar.id}
                  >
                    {registering === webinar.id ? "..." : t("register")}
                  </Button>
                )}
                {isScheduled && webinar.isRegistered && (
                  <Badge variant="outline" className="gap-1 text-green-500">
                    <CheckCircle2 className="size-3" />
                    {t("registered")}
                  </Badge>
                )}
                {isEnded && (
                  <Button size="sm" variant="outline" className="flex-1" disabled>
                    {t("ended")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
