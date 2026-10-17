import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hideReview, unhideReview } from "@/actions/moderation";
import { getPublicDisplayLabel } from "@/lib/profile/display";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRatingDisplay } from "./star-rating-display";
import { ReviewForm } from "./review-form";
import { ReportReviewButton } from "./report-review-button";

const REVIEW_ELIGIBILITY_DAYS = 7;

function reviewEligibleSince(): Date {
  return new Date(Date.now() - REVIEW_ELIGIBILITY_DAYS * 86_400_000);
}

export async function ProviderReviewSection({
  profileUserId,
  locale,
}: {
  profileUserId: string;
  locale: string;
}) {
  const t = await getTranslations("copyTrade");
  const session = await auth();
  const viewerId = session?.user?.id;

  const viewerDbUser = viewerId
    ? await prisma.user.findUnique({ where: { id: viewerId }, select: { role: true } })
    : null;
  const isMod = viewerDbUser?.role === "MOD" || viewerDbUser?.role === "ADMIN";
  const isSelf = viewerId === profileUserId;

  const [aggregate, distribution, reviews, eligibleCopyTrade, myReview] = await Promise.all([
    prisma.copyTradeReview.aggregate({
      where: { providerId: profileUserId, hidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.copyTradeReview.groupBy({
      by: ["rating"],
      where: { providerId: profileUserId, hidden: false },
      _count: { rating: true },
    }),
    prisma.copyTradeReview.findMany({
      where: { providerId: profileUserId, hidden: isMod ? undefined : false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reviewer: { select: { id: true, name: true, email: true } } },
    }),
    viewerId && !isSelf
      ? prisma.copyTrade.findFirst({
          where: {
            followerId: viewerId,
            providerId: profileUserId,
            createdAt: { lte: reviewEligibleSince() },
          },
          select: { id: true },
        })
      : null,
    viewerId && !isSelf
      ? prisma.copyTradeReview.findUnique({
          where: { reviewerId_providerId: { reviewerId: viewerId, providerId: profileUserId } },
          select: { rating: true, comment: true },
        })
      : null,
  ]);

  const avgRating = aggregate._avg.rating ?? 0;
  const reviewCount = aggregate._count.rating;
  const distributionMap = new Map(distribution.map((d) => [d.rating, d._count.rating]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="font-mono text-3xl font-bold text-foreground">
            {reviewCount > 0 ? avgRating.toFixed(1) : "—"}
          </p>
          <div>
            <StarRatingDisplay rating={avgRating} size="md" />
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("reviewCount", { count: reviewCount })}
            </p>
          </div>
        </div>
        {reviewCount > 0 && (
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distributionMap.get(star) ?? 0;
              const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2.5 text-right">{star}</span>
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isSelf && viewerId && (
        eligibleCopyTrade ? (
          <ReviewForm
            providerId={profileUserId}
            existingRating={myReview?.rating}
            existingComment={myReview?.comment}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            {t("reviewNotEligibleHint", { days: REVIEW_ELIGIBILITY_DAYS })}
          </p>
        )
      )}

      {reviews.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("reviewEmpty")}
        </section>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const label = getPublicDisplayLabel(review.reviewer.name, review.reviewer.email);
            const isAuthor = viewerId === review.reviewer.id;
            return (
              <div key={review.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Link href={`/u/${review.reviewer.id}`} className="font-medium text-foreground hover:underline">
                    {label}
                  </Link>
                  <StarRatingDisplay rating={review.rating} />
                  <span>·</span>
                  <span>{new Date(review.createdAt).toLocaleDateString(locale)}</span>
                  {review.hidden && isMod && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t("reviewHiddenBadge")}
                    </Badge>
                  )}
                  {isMod && (
                    <span className="ml-auto">
                      {review.hidden ? (
                        <form action={unhideReview} className="inline">
                          <input type="hidden" name="copyTradeReviewId" value={review.id} />
                          <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                            {t("reviewUnhide")}
                          </Button>
                        </form>
                      ) : (
                        <form action={hideReview} className="inline">
                          <input type="hidden" name="copyTradeReviewId" value={review.id} />
                          <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs">
                            {t("reviewHide")}
                          </Button>
                        </form>
                      )}
                    </span>
                  )}
                </div>
                {review.comment && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{review.comment}</p>
                )}
                {viewerId && !isAuthor && !isMod && (
                  <ReportReviewButton reviewId={review.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
