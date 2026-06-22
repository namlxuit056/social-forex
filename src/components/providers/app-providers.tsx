"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AiAdvisorChat } from "@/components/ai/ai-advisor-chat";
import { GoldAiPopup } from "@/components/onboarding/gold-ai-popup";
import { UserActivityTracker } from "@/components/analytics/user-activity-tracker";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
    >
      <SessionProvider>
        {children}
        <Suspense fallback={null}>
          <UserActivityTracker />
        </Suspense>
        <AiAdvisorChat />
        <GoldAiPopup />
        <PwaInstallPrompt />
        <Toaster position="top-center" richColors closeButton />
      </SessionProvider>
    </ThemeProvider>
  );
}
