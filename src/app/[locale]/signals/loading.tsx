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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-full max-w-md sm:w-72" />
        </div>
        <Card className="border-border bg-muted/10">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <Skeleton className="h-16 rounded-md lg:col-span-2" />
              <Skeleton className="h-16 rounded-md lg:col-span-2" />
              <Skeleton className="h-16 rounded-md lg:col-span-4" />
              <Skeleton className="h-16 rounded-md lg:col-span-4" />
            </div>
            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-12">
              <Skeleton className="h-16 rounded-md lg:col-span-3" />
              <Skeleton className="h-16 rounded-md lg:col-span-3" />
              <Skeleton className="h-20 rounded-md lg:col-span-6" />
            </div>
          </CardContent>
        </Card>
        <ul className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Card className="overflow-hidden border-border">
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-48 max-w-full sm:w-56" />
                  </div>
                  <Skeleton className="h-20 w-full max-w-md rounded-lg" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg sm:col-span-1" />
                  </div>
                  <Skeleton className="h-9 w-full max-w-xs" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <Skeleton className="h-4 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </section>
    </div>
  );
}
