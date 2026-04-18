export default function PublicProfileLoading() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card/50 p-4 ring-1 ring-foreground/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="flex gap-4 sm:gap-5">
            <div className="size-16 shrink-0 animate-pulse rounded-full bg-muted/50 sm:size-20" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-7 w-48 max-w-full animate-pulse rounded-md bg-muted/50" />
              <div className="h-3 w-40 animate-pulse rounded-md bg-muted/40" />
              <div className="h-4 w-56 animate-pulse rounded-md bg-muted/40" />
              <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted/30" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted/50" />
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted/50" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 ring-1 ring-foreground/5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded-md bg-muted/50" />
        <div className="h-12 w-32 animate-pulse rounded-md bg-muted/40" />
        <div className="mt-4 h-9 w-full max-w-xs animate-pulse rounded-md bg-muted/40" />
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-card/50 p-4 ring-1 ring-foreground/5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 text-center">
            <div className="mx-auto h-3 w-16 animate-pulse rounded bg-muted/40" />
            <div className="mx-auto h-6 w-8 animate-pulse rounded bg-muted/50" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted/50" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="flex h-14 animate-pulse items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-3"
            >
              <div className="size-9 shrink-0 rounded-full bg-muted/50" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted/40" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
