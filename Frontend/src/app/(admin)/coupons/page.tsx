"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface Coupon {
  coupon_id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "Percentage",
    discountValue: "",
    minOrderAmount: "0",
    expiryDate: "",
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get("/coupons");
      if (res.success && res.coupons) {
        setCoupons(res.coupons);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openAddModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: "",
      discountType: "Percentage",
      discountValue: "",
      minOrderAmount: "0",
      expiryDate: "",
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    // Format date string to YYYY-MM-DD for date input
    const formattedDate = coupon.expiry_date
      ? new Date(coupon.expiry_date).toISOString().split("T")[0]
      : "";
    setFormData({
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value.toString(),
      minOrderAmount: coupon.min_order_amount.toString(),
      expiryDate: formattedDate,
      isActive: coupon.is_active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload = {
        code: formData.code,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minOrderAmount: parseFloat(formData.minOrderAmount || "0"),
        expiryDate: formData.expiryDate,
        isActive: formData.isActive,
      };

      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon.coupon_id}`, payload);
      } else {
        await api.post("/coupons", payload);
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to save coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (id: number) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await api.delete(`/coupons/${deletingId}`);
      setIsDeleteOpen(false);
      fetchCoupons();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  // Local Pagination calculation
  const totalPages = Math.ceil(coupons.length / itemsPerPage);
  const currentCoupons = coupons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Coupon Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Create and manage customer discounts, percentage off, or fixed values.
          </p>
        </div>
        <div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
          >
            Add Coupon
          </button>
        </div>
      </div>

      {/* Coupons Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No coupons found. Click "Add Coupon" to get started.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Min Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expiry Date
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
                  {currentCoupons.map((coupon) => (
                    <tr key={coupon.coupon_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-805 dark:text-white">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-semibold">
                        {coupon.discount_type === "Percentage"
                          ? `${coupon.discount_value}% Off`
                          : `$${coupon.discount_value.toFixed(2)} Off`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        ${coupon.min_order_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {new Date(coupon.expiry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          coupon.is_active && new Date(coupon.expiry_date) > new Date()
                            ? "bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400"
                            : "bg-error-50 text-error-700 dark:bg-error-950/20 dark:text-error-400"
                        }`}>
                          {coupon.is_active && new Date(coupon.expiry_date) > new Date()
                            ? "Active"
                            : "Expired/Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="text-brand-500 hover:text-brand-600 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(coupon.coupon_id)}
                            className="text-error-500 hover:text-error-600 font-semibold"
                          >
                            Delete
                          </button>
                        </div>
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

      {/* Add / Edit Coupon Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-5">
          {editingCoupon ? "Edit Coupon" : "Add New Coupon"}
        </h2>
        {formError && (
          <div className="mb-4 text-sm text-error-500 bg-error-50 dark:bg-error-950/20 p-3 rounded-lg border border-error-200 dark:border-error-800">
            {formError}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-805 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 font-mono"
                placeholder="e.g. SUMMER50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-805 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Discount Value *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-805 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                placeholder={formData.discountType === "Percentage" ? "e.g. 10 for 10%" : "e.g. 5.00 for $5"}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Minimum Order Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-805 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                placeholder="e.g. 50.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-805 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Is Active
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} className="max-w-sm p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-50 dark:bg-error-950/20 text-error-600 dark:text-error-400 mb-4">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-2">Delete Coupon</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-normal">
          Are you sure you want to delete this coupon? This action cannot be undone.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setIsDeleteOpen(false)}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-error-500 hover:bg-error-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
