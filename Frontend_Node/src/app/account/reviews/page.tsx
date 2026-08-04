'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { reviewService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { getImageUrl, formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Pagination,
  StarRating,
  Textarea,
} from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton } from '@/components/ui/Feedback';
import type { MyReview } from '@/types/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Approved: 'success',
  Pending: 'warning',
  Rejected: 'danger',
};

export default function MyReviewsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);

  const reviews = useApiResource(
    (signal) => reviewService.mine({ page, limit: 10 }, signal),
    [page]
  );

  const [editing, setEditing] = useState<MyReview | null>(null);
  const [draft, setDraft] = useState({ rating: 5, title: '', body: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MyReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = reviews.data?.data ?? [];
  const meta = reviews.data?.meta;

  const openEdit = (review: MyReview) => {
    setEditing(review);
    setDraft({ rating: review.rating, title: review.title, body: review.body });
    setErrors({});
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;

    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim()) nextErrors.title = 'A headline is required.';
    if (draft.body.trim().length < 20)
      nextErrors.body = `Reviews must be at least 20 characters (${draft.body.trim().length}/20).`;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await reviewService.update(editing.review_id, {
        rating: draft.rating,
        title: draft.title.trim(),
        body: draft.body.trim(),
      });
      toast.success('Review updated and sent for re-approval.');
      setEditing(null);
      reviews.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update your review.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await reviewService.remove(confirmDelete.review_id);
      toast.success('Review deleted.');
      setConfirmDelete(null);
      reviews.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete your review.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          Your feedback
        </span>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          My Reviews
        </h1>
        {meta && (
          <p className="text-sm text-on-surface-variant">
            {meta.total} review{meta.total === 1 ? '' : 's'} written
          </p>
        )}
      </header>

      {reviews.loading && <ListRowSkeleton count={3} />}

      {!reviews.loading && reviews.error && (
        <ErrorState message={reviews.error} onRetry={reviews.reload} />
      )}

      {!reviews.loading && !reviews.error && items.length === 0 && (
        <EmptyState
          icon="reviews"
          title="You have not written any reviews"
          description="Review a delivered order to help other customers decide."
          actionLabel="View your orders"
          actionHref="/account/orders"
        />
      )}

      <ul className="space-y-4">
        {items.map((review) => (
          <li
            key={review.review_id}
            className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 sm:flex-row"
          >
            <Link
              href={`/product/${review.product_id}`}
              className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-surface-container sm:h-24 sm:w-20"
            >
              <Image
                src={getImageUrl(review.product_image)}
                alt={review.product_name}
                fill
                sizes="(max-width: 640px) 100vw, 80px"
                className="object-cover"
              />
            </Link>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/product/${review.product_id}`}>
                    <h2 className="font-headline text-base font-bold text-primary hover:underline">
                      {review.product_name}
                    </h2>
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StarRating rating={review.rating} />
                    <Badge tone={STATUS_TONE[review.status] ?? 'neutral'}>{review.status}</Badge>
                  </div>
                </div>
                <span className="text-xs text-outline">{formatDate(review.created_at)}</span>
              </div>

              <div>
                <h3 className="font-headline text-sm font-bold text-primary">{review.title}</h3>
                <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                  {review.body}
                </p>
              </div>

              {review.status === 'Pending' && (
                <p className="text-xs text-outline">
                  Awaiting moderation — it will appear on the product page once approved.
                </p>
              )}

              <div className="flex gap-4 border-t border-outline-variant/20 pt-3">
                <button
                  onClick={() => openEdit(review)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outline transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(review)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outline transition-colors hover:text-error"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {meta && meta.totalPages > 1 && (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit your review"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditing(null)} className="py-2.5">
              Cancel
            </Button>
            <Button type="submit" form="edit-review-form" loading={saving} className="py-2.5">
              Save changes
            </Button>
          </div>
        }
      >
        <form id="edit-review-form" onSubmit={saveEdit} noValidate className="space-y-5">
          <p className="rounded-md bg-surface-container px-4 py-3 text-xs text-on-surface-variant">
            Edited reviews return to moderation before they are published again.
          </p>

          <Field label="Your rating" required>
            <StarRating
              rating={draft.rating}
              size="md"
              onChange={(rating) => setDraft((prev) => ({ ...prev, rating }))}
            />
          </Field>

          <Field label="Headline" required error={errors.title} htmlFor="edit-title">
            <Input
              id="edit-title"
              maxLength={200}
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              invalid={!!errors.title}
            />
          </Field>

          <Field
            label="Your review"
            required
            error={errors.body}
            hint={`${draft.body.trim().length}/5000 characters — minimum 20.`}
            htmlFor="edit-body"
          >
            <Textarea
              id="edit-body"
              rows={6}
              maxLength={5000}
              value={draft.body}
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              invalid={!!errors.body}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this review?"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="py-2.5">
              Keep it
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting} className="py-2.5">
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Your review of{' '}
          <strong className="text-primary">{confirmDelete?.product_name}</strong>{' '}
          will be permanently removed.
        </p>
      </Modal>
    </div>
  );
}
