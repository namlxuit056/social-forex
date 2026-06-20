"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
    >
      <Sun className="size-4 hidden dark:block" suppressHydrationWarning />
      <Moon className="size-4 dark:hidden" suppressHydrationWarning />
    </button>
  );
}
