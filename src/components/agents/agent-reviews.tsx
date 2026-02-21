// =============================================================
// Agent Reviews — Star rating form + review list (Client)
// Renders on the agent detail page. Users can submit reviews
// after executing the agent at least once.
// =============================================================

"use client";

import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { Star, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { firstName: string | null; lastName: string | null };
}

interface UserReview {
  id: string;
  rating: number;
  comment: string | null;
}

interface ReviewsResponse {
  reviews: ReviewData[];
  distribution: Record<number, number>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  userReview: UserReview | null;
}

interface AgentReviewsProps {
  agentId: string;
  initialData: ReviewsResponse;
  /** Server-verified: user has a valid DB session (not just Clerk sign-in) */
  isAuthenticated?: boolean;
}

// -------------------------------------------------------------
// Star Rating Input
// -------------------------------------------------------------

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className="rounded p-0.5 transition-colors hover:bg-accent disabled:cursor-not-allowed"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Rating Distribution Bar
// -------------------------------------------------------------

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-muted-foreground">{star}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------

export function AgentReviews({ agentId, initialData, isAuthenticated }: AgentReviewsProps) {
  const { isSignedIn } = useUser();
  const canInteract = isAuthenticated ?? false;
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initialData);
  const [rating, setRating] = useState(initialData.userReview?.rating ?? 0);
  const [comment, setComment] = useState(initialData.userReview?.comment ?? "");
  const [page, setPage] = useState(1);

  const { reviews, distribution, pagination, userReview } = data;
  const totalReviews = pagination.total;

  // Fetch reviews for a given page
  async function fetchReviews(p: number) {
    const res = await fetch(`/api/agents/${agentId}/reviews?page=${p}&limit=10`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setPage(p);
      }
    }
  }

  // Submit or update a review
  function handleSubmit() {
    if (rating < 1) {
      toast.error("Please select a rating");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            comment: comment.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          const msg = res.status === 401
            ? "Please sign in and complete onboarding first"
            : res.status === 412
              ? "You need to execute this agent before reviewing it"
              : json.error?.message ?? "Failed to submit review";
          toast.error(msg);
          return;
        }

        toast.success(userReview ? "Review updated" : "Review submitted!");
        await fetchReviews(1);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  // Delete own review
  function handleDelete() {
    if (!userReview) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${userReview.id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to delete review");
          return;
        }
        toast.success("Review deleted");
        setRating(0);
        setComment("");
        await fetchReviews(1);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Reviews {totalReviews > 0 && `(${totalReviews})`}
      </h2>

      {/* Rating distribution */}
      {totalReviews > 0 && (
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <RatingBar
              key={star}
              star={star}
              count={distribution[star] ?? 0}
              total={totalReviews}
            />
          ))}
        </div>
      )}

      <Separator />

      {/* Review form (only for fully authenticated users with DB session) */}
      {isSignedIn && !canInteract && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Please complete onboarding to write reviews.
            </p>
          </CardContent>
        </Card>
      )}
      {canInteract && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm font-medium">
              {userReview ? "Update your review" : "Write a review"}
            </p>
            <StarRating value={rating} onChange={setRating} disabled={isPending} />
            <Textarea
              placeholder="Share your experience (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isPending}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || rating < 1}
              >
                {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {userReview ? "Update" : "Submit"}
              </Button>
              {userReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Be the first to try this agent!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex gap-3 pt-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {(review.user.firstName?.[0] ?? "") +
                      (review.user.lastName?.[0] ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {review.user.firstName} {review.user.lastName}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-ZA")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => fetchReviews(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => fetchReviews(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
