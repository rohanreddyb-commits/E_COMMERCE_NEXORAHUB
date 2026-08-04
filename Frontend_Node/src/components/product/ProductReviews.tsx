'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { reviewService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { formatDate, formatRating } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  StarRating,
  Textarea,
} from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton } from '@/components/ui/Feedback';

type SortKey = 'recent' | 'rating_high' | 'rating_low' | 'helpful';

const SORTS: { label: string; value: SortKey }[] = [
  { label: 'Most recent', value: 'recent' },
  { label: 'Most helpful', value: 'helpful' },
  { label: 'Highest rated', value: 'rating_high' },
  { label: 'Lowest rated', value: 'rating_low' },
];

interface ProductReviewsProps {
  productId: number;
  /** Aggregate from the product endpoint, used before reviews load. */
  averageRating: number;
  reviewCount: number;
  /** Called after a successful submission so the parent can refresh aggregates. */
  onReviewSubmitted?: () => void;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  averageRating,
  reviewCount,
  onReviewSubmitted,
}) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>('recent');
  const [writeOpen, setWriteOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<number>>(new Set());

  const [draft, setDraft] = useState({ rating: 5, title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reviews = useApiResource(
    (signal) => reviewService.forProduct(productId, { page, limit: 5, sort }, signal),
    [productId, page, sort]
  );

  const breakdown = reviews.data?.ratingBreakdown;
  const total = reviews.data?.meta.total ?? reviewCount;

  const validateDraft = (): boolean => {
    const errors: Record<string, string> = {};
    if (draft.rating < 1 || draft.rating > 5) errors.rating = 'Select a rating from 1 to 5.';
    if (!draft.title.trim()) errors.title = 'A short headline is required.';
    else if (draft.title.length > 200) errors.title = 'Keep the headline under 200 characters.';
    // Backend enforces 20–5000 characters on the body.
    if (draft.body.trim().length < 20)
      errors.body = `Reviews must be at least 20 characters (${draft.body.trim().length}/20).`;
    else if (draft.body.length > 5000) errors.body = 'Reviews cannot exceed 5000 characters.';

    setDraftErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!validateDraft()) return;

    setSubmitting(true);
    try {
      const result = await reviewService.create(productId, {
        rating: draft.rating,
        title: draft.title.trim(),
        body: draft.body.trim(),
      });
      toast.success(
        result.isVerifiedPurchase
          ? 'Thanks! Your verified review is awaiting approval.'
          : 'Thanks! Your review is awaiting approval.'
      );
      setWriteOpen(false);
      setDraft({ rating: 5, title: '', body: '' });
      reviews.reload();
      onReviewSubmitted?.();
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'Could not submit your review.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const voteHelpful = async (reviewId: number) => {
    if (!isAuthenticated) {
      toast.info('Sign in to mark reviews as helpful.');
      return;
    }
    if (votedIds.has(reviewId)) return;

    // Optimistic — the vote is low-stakes and the endpoint is idempotent per user.
    setVotedIds((current) => new Set(current).add(reviewId));
    try {
      await reviewService.voteHelpful(reviewId);
      reviews.reload();
    } catch (error) {
      setVotedIds((current) => {
        const next = new Set(current);
        next.delete(reviewId);
        return next;
      });
      toast.error(error instanceof ApiError ? error.message : 'Could not register your vote.');
    }
  };

  return (
    <section id="reviews" className="space-y-8 border-t border-outline-variant/30 pt-12">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            Customer feedback
          </span>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
            Reviews
          </h2>
          <div className="flex items-center gap-3">
            <span className="font-headline text-4xl font-extrabold text-primary">
              {formatRating(averageRating)}
            </span>
            <div>
              <StarRating rating={averageRating} size="md" />
              <p className="mt-0.5 text-xs text-outline">
                Based on {total} review{total === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        {breakdown && total > 0 && (
          <div className="w-full max-w-xs space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = breakdown[star] ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-outline">{star}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-outline">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="shrink-0">
          {isAuthenticated ? (
            <Button icon="rate_review" onClick={() => setWriteOpen(true)}>
              Write a review
            </Button>
          ) : (
            <Link
              href={`/login?next=/product/${productId}`}
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">login</span>
              Sign in to review
            </Link>
          )}
        </div>
      </div>

      {(reviews.data?.data.length ?? 0) > 0 && (
        <div className="flex justify-end">
          <Select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
            }}
            aria-label="Sort reviews"
            className="w-48 py-2 text-xs"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {reviews.loading && <ListRowSkeleton count={3} />}

      {!reviews.loading && reviews.error && (
        <ErrorState message={reviews.error} onRetry={reviews.reload} />
      )}

      {!reviews.loading && !reviews.error && (reviews.data?.data.length ?? 0) === 0 && (
        <EmptyState
          icon="reviews"
          title="No reviews yet"
          description="Be the first to share your experience with this piece."
        />
      )}

      {!reviews.loading && !reviews.error && (reviews.data?.data.length ?? 0) > 0 && (
        <>
          <ul className="space-y-5">
            {reviews.data!.data.map((review) => (
              <li
                key={review.review_id}
                className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-primary">{review.reviewer_name}</span>
                      {review.is_verified_purchase && (
                        <Badge tone="success">Verified purchase</Badge>
                      )}
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <span className="text-xs text-outline">{formatDate(review.created_at)}</span>
                </div>

                <div>
                  <h3 className="font-headline text-base font-bold text-primary">{review.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                    {review.body}
                  </p>
                </div>

                <button
                  onClick={() => voteHelpful(review.review_id)}
                  disabled={votedIds.has(review.review_id)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                    votedIds.has(review.review_id)
                      ? 'cursor-default text-secondary'
                      : 'text-outline hover:text-primary'
                  )}
                >
                  <span
                    className={cn(
                      'material-symbols-outlined text-base',
                      votedIds.has(review.review_id) && 'fill'
                    )}
                  >
                    thumb_up
                  </span>
                  Helpful ({review.helpful_votes})
                </button>
              </li>
            ))}
          </ul>

          {reviews.data!.meta.totalPages > 1 && (
            <Pagination
              page={reviews.data!.meta.page}
              totalPages={reviews.data!.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        title="Write a review"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setWriteOpen(false)} className="py-2.5">
              Cancel
            </Button>
            <Button
              type="submit"
              form="review-form"
              loading={submitting}
              className="py-2.5"
            >
              Submit review
            </Button>
          </div>
        }
      >
        {submitError && (
          <div
            role="alert"
            className="mb-4 rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
          >
            {submitError}
          </div>
        )}

        <form id="review-form" onSubmit={submitReview} noValidate className="space-y-5">
          <Field label="Your rating" required error={draftErrors.rating}>
            <StarRating
              rating={draft.rating}
              size="md"
              onChange={(rating) => setDraft((prev) => ({ ...prev, rating }))}
            />
          </Field>

          <Field label="Headline" required error={draftErrors.title} htmlFor="review-title">
            <Input
              id="review-title"
              maxLength={200}
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              invalid={!!draftErrors.title}
              placeholder="Sum up your experience"
            />
          </Field>

          <Field
            label="Your review"
            required
            error={draftErrors.body}
            hint={`${draft.body.trim().length}/5000 characters — minimum 20.`}
            htmlFor="review-body"
          >
            <Textarea
              id="review-body"
              rows={6}
              maxLength={5000}
              value={draft.body}
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              invalid={!!draftErrors.body}
              placeholder="What did you think of the fit, fabric and finish?"
            />
          </Field>

          <p className="text-xs text-outline">
            Reviews are published after moderation. You can review each product once.
          </p>
        </form>
      </Modal>
    </section>
  );
};
