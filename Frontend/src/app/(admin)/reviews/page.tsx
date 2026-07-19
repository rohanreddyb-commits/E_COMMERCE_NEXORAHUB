"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface Review {
  review_id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 10;

  // Moderate Modal
  const [isModerateOpen, setIsModerateOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (statusFilter) {
        params.append("status", statusFilter);
      }
      const res: any = await api.get(`/reviews?${params.toString()}`);
      if (res.success && res.data) {
        setReviews(res.data.data);
        if (res.data.total) {
          setTotalPages(Math.max(1, Math.ceil(res.data.total / limit)));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [currentPage, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReviews();
  };

  const openModerateModal = (review: Review) => {
    setSelectedReview(review);
    setIsModerateOpen(true);
  };

  const handleModerateSubmit = async (status: 'Approved' | 'Rejected') => {
    if (!selectedReview) return;
    setSubmitting(true);

    try {
      await api.patch(`/reviews/${selectedReview.review_id}/status`, {
        status
      });
      setIsModerateOpen(false);
      fetchReviews();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to moderate review.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-750 dark:bg-success-950/20 dark:text-success-450">
            Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-750 dark:bg-warning-950/20 dark:text-warning-450">
            Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-semibold text-error-750 dark:bg-error-950/20 dark:text-error-450">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return <div className="flex items-center">{stars}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Product Reviews
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Moderate customer ratings, verify feedback submissions, and ensure content quality.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2 text-sm text-gray-855 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-white/[0.03] p-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs">
        <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, customer, or title..."
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-850 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 w-full md:w-64 font-normal"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Reviews Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400 font-normal">
            No reviews found.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Author / Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Feedback
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {reviews.map((review) => (
                    <tr key={review.review_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="block font-bold text-gray-805 dark:text-white text-sm">
                          {review.product_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-semibold">
                        {review.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStars(review.rating)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-550 dark:text-gray-400 font-normal max-w-xs">
                        <span className="block font-bold text-gray-700 dark:text-gray-200 truncate">{review.title || 'Untitled'}</span>
                        <p className="line-clamp-2 mt-0.5">{review.comment || '-'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {new Date(review.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(review.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {review.status === "Pending" ? (
                          <button
                            onClick={() => openModerateModal(review)}
                            className="text-brand-500 hover:text-brand-600 font-semibold"
                          >
                            Moderate
                          </button>
                        ) : (
                          <button
                            onClick={() => openModerateModal(review)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-semibold"
                          >
                            Review Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Moderate Feedback Modal */}
      <Modal isOpen={isModerateOpen} onClose={() => setIsModerateOpen(false)} className="max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Moderate Customer Review
        </h2>
        {selectedReview && (
          <div className="space-y-4 font-normal mt-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-150 dark:border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800 dark:text-white text-sm">{selectedReview.customer_name}</span>
                {renderStars(selectedReview.rating)}
              </div>
              <span className="block font-bold text-gray-700 dark:text-gray-205 text-sm">{selectedReview.title || 'Untitled'}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedReview.comment}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
              <button
                type="button"
                onClick={() => setIsModerateOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              {selectedReview.status === "Pending" && (
                <>
                  <button
                    onClick={() => handleModerateSubmit('Rejected')}
                    disabled={submitting}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-error-500 hover:bg-error-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleModerateSubmit('Approved')}
                    disabled={submitting}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-success-500 hover:bg-success-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
