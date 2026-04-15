import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignalsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <section className="space-y-4" aria-hidden>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">
            <Skeleton className="h-16 flex-1 rounded-md" />
            <Skeleton className="h-16 flex-1 rounded-md" />
            <Skeleton className="h-16 flex-1 rounded-md" />
          </div>
        </div>
        <ul className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Card>
                <CardContent className="space-y-3 pt-4 pb-4">
                  <div className="flex justify-between gap-4">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4 max-w-md" />
                  <Skeleton className="h-9 w-full max-w-xs" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
