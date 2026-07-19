"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface Brand {
  brand_id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res: any = await api.get("/brands");
      if (res.success && res.data) {
        setBrands(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load brands.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openAddModal = () => {
    setEditingBrand(null);
    setFormData({ name: "", description: "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, description: brand.description || "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand.brand_id}`, formData);
      } else {
        await api.post("/brands", formData);
      }
      setIsModalOpen(false);
      fetchBrands();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to save brand.");
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
      await api.delete(`/brands/${deletingId}`);
      setIsDeleteOpen(false);
      fetchBrands();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete brand.");
    } finally {
      setSubmitting(false);
    }
  };

  // Local Pagination calculation
  const totalPages = Math.max(1, Math.ceil(brands.length / itemsPerPage));
  const currentItems = brands.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Brand Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Organize catalog products by creating and managing brand listings.
          </p>
        </div>
        <div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
          >
            Add Brand
          </button>
        </div>
      </div>

      {/* Brands Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No brands found. Click "Add Brand" to get started.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {currentItems.map((brand) => (
                    <tr key={brand.brand_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-white">
                        {brand.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {brand.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {new Date(brand.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openEditModal(brand)}
                            className="text-brand-500 hover:text-brand-600 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(brand.brand_id)}
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

      {/* Add / Edit Brand Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-5">
          {editingBrand ? "Edit Brand" : "Add New Brand"}
        </h2>
        {formError && (
          <div className="mb-4 text-sm text-error-500 bg-error-50 dark:bg-error-950/20 p-3 rounded-lg border border-error-200 dark:border-error-800">
            {formError}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Brand Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              placeholder="e.g. Apple, Nike"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 h-24 resize-none"
              placeholder="Provide a brief description of the brand..."
            />
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
        <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-2">Delete Brand</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-normal">
          Are you sure you want to delete this brand? This action cannot be undone.
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
