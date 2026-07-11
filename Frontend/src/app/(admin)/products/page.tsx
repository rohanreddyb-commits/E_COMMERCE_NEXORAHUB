"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface Product {
  product_id: number;
  name: string;
  description: string;
  price: number;
  sku: string;
  stock_quantity: number;
  category_id: number;
  category_name?: string;
  status: string;
  primary_image?: string | null;
}

interface Category {
  category_id: number;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const limit = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    sku: "",
    stockQuantity: "",
    categoryId: "",
    status: "Active",
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/products/categories");
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (categoryFilter) {
        params.append("category", categoryFilter);
      }
      
      const res = await api.get(`/products?${params.toString()}`);
      if (res.success && res.products) {
        setProducts(res.products);
        if (res.pagination) {
          setTotalPages(res.pagination.pages || 1);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      sku: "",
      stockQuantity: "",
      categoryId: categories[0]?.category_id.toString() || "",
      status: "Active",
    });
    setFiles(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      sku: product.sku,
      stockQuantity: product.stock_quantity.toString(),
      categoryId: product.category_id.toString(),
      status: product.status,
    });
    setFiles(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("sku", formData.sku);
      data.append("stockQuantity", formData.stockQuantity);
      data.append("categoryId", formData.categoryId);
      data.append("status", formData.status);

      if (files) {
        for (let i = 0; i < files.length; i++) {
          data.append("images", files[i]);
        }
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.product_id}`, data);
      } else {
        await api.post("/products", data);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to save product.");
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
      await api.delete(`/products/${deletingId}`);
      setIsDeleteOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Product Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Manage your store items, update pricing, SKU, stock quantity, and images.
          </p>
        </div>
        <div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-white/[0.03] p-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs">
        <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-850 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 w-full md:w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex w-full md:w-auto items-center gap-2 justify-end">
          <label className="text-sm font-semibold text-gray-505 dark:text-gray-400 whitespace-nowrap">
            Category:
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2 text-sm text-gray-850 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 w-full md:w-48"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No products found. Click "Add Product" to get started.
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
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stock
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
                  {products.map((product) => (
                    <tr key={product.product_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            {product.primary_image ? (
                              <img
                                src={`http://localhost:5000${product.primary_image}`}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-normal line-clamp-1 max-w-xs">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-semibold">
                        {product.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-semibold">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {product.stock_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          product.status === "Active"
                            ? "bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openEditModal(product)}
                            className="text-brand-500 hover:text-brand-600 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(product.product_id)}
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

      {/* Add / Edit Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-xl p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-5">
          {editingProduct ? "Edit Product" : "Add New Product"}
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
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                placeholder="e.g. Leather Wallet"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                SKU *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                placeholder="e.g. LTHR-WLT-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                placeholder="e.g. 29.99"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                placeholder="e.g. 150"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              >
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Product Images (up to 5)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(e.target.files)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-white hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 h-24 resize-none"
              placeholder="Provide a detailed description of the product..."
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
        <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-2">Delete Product</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-normal">
          Are you sure you want to delete this product? This action cannot be undone.
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
