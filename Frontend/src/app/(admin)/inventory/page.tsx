"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface VariantInventoryItem {
  variant_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  price: number | null;
  stock: number;
  is_active: boolean;
  updated_at: string;
  combination_label: string;
}

interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  reserved_quantity: number;
  warehouse_location: string | null;
  last_restock_date: string | null;
}

interface HistoryItem {
  history_id: number;
  inventory_id: number;
  change_amount: number;
  reason: string;
  notes: string | null;
  created_at: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"products" | "variants">("products");

  // Variant inventory state
  const [variantInventory, setVariantInventory] = useState<VariantInventoryItem[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [variantPage, setVariantPage] = useState(1);
  const [variantTotalPages, setVariantTotalPages] = useState(1);
  const [variantSearch, setVariantSearch] = useState("");
  const variantLimit = 20;

  // Adjust Variant Stock Modal
  const [isVariantAdjustOpen, setIsVariantAdjustOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantInventoryItem | null>(null);
  const [variantAdjustForm, setVariantAdjustForm] = useState({ delta: "", notes: "" });
  const [variantAdjustError, setVariantAdjustError] = useState<string | null>(null);
  const [variantAdjustSubmitting, setVariantAdjustSubmitting] = useState(false);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  // Adjust Stock Modal
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    changeAmount: "",
    reason: "Restock",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Log Modal
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<HistoryItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      if (search.trim()) {
        params.append("search", search.trim());
      }
      const res: any = await api.get(`/inventory?${params.toString()}`);
      if (res.success && res.data) {
        setInventory(res.data.data);
        if (res.data.total) {
          setTotalPages(Math.max(1, Math.ceil(res.data.total / limit)));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVariantInventory = async () => {
    setVariantLoading(true);
    setVariantError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", variantPage.toString());
      params.append("limit", variantLimit.toString());
      if (variantSearch.trim()) params.append("search", variantSearch.trim());
      const res: any = await api.get(`/products/variant-inventory?${params.toString()}`);
      if (res.success && res.data) {
        setVariantInventory(res.data.data);
        setVariantTotalPages(Math.max(1, Math.ceil(res.data.total / variantLimit)));
      }
    } catch (err: any) {
      setVariantError("Failed to load variant inventory.");
    } finally {
      setVariantLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === "variants") fetchVariantInventory();
  }, [activeTab, variantPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInventory();
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustForm({
      changeAmount: "",
      reason: "Restock",
      notes: "",
    });
    setFormError(null);
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setFormError(null);
    setSubmitting(true);

    const amount = parseInt(adjustForm.changeAmount);
    if (isNaN(amount) || amount === 0) {
      setFormError("Please enter a valid non-zero adjustment amount.");
      setSubmitting(false);
      return;
    }

    try {
      await api.post(`/inventory/adjust/${selectedItem.product_id}`, {
        changeAmount: amount,
        reason: adjustForm.reason,
        notes: adjustForm.notes,
      });
      setIsAdjustOpen(false);
      fetchInventory();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to adjust inventory.");
    } finally {
      setSubmitting(false);
    }
  };

  const openLogModal = async (item: InventoryItem) => {
    setSelectedItem(item);
    setIsLogOpen(true);
    setLogsLoading(true);
    try {
      const res: any = await api.get(`/inventory/history/${item.product_id}`);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to load history logs.");
      setIsLogOpen(false);
    } finally {
      setLogsLoading(false);
    }
  };

  const getStockStatusBadge = (qty: number, threshold: number) => {
    if (qty === 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-semibold text-error-750 dark:bg-error-950/20 dark:text-error-450">
          Out of Stock
        </span>
      );
    }
    if (qty <= threshold) {
      return (
        <span className="inline-flex items-center rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-750 dark:bg-warning-950/20 dark:text-warning-450">
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-750 dark:bg-success-950/20 dark:text-success-450">
        In Stock
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Inventory & Stock Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Monitor real-time stock levels, record warehouse adjustments, and view inventory history.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {[{key: "products", label: "Product Inventory"}, {key: "variants", label: "Variant Inventory"}].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "products" | "variants")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product Inventory Search Bar */}
      {activeTab === "products" && (
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-white/[0.03] p-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs">
        <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or Product..."
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
      )}

      {/* Variant Inventory Search Bar */}
      {activeTab === "variants" && (
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-white/[0.03] p-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs">
        <form onSubmit={(e) => { e.preventDefault(); setVariantPage(1); fetchVariantInventory(); }} className="flex w-full md:w-auto items-center gap-2">
          <input
            type="text"
            value={variantSearch}
            onChange={(e) => setVariantSearch(e.target.value)}
            placeholder="Search variant SKU or product..."
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-850 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 w-full md:w-64 font-normal"
          />
          <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
            Search
          </button>
        </form>
      </div>
      )}

      {/* Product Inventory Table Card */}
      {activeTab === "products" && (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No stock records found.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Product Detail
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Warehouse Location
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {inventory.map((item) => (
                    <tr key={item.inventory_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="block font-bold text-gray-805 dark:text-white text-sm">
                          {item.product_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-bold">
                        {item.quantity} units{' '}
                        {item.reserved_quantity > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal block mt-0.5">
                            ({item.reserved_quantity} reserved)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStockStatusBadge(item.quantity, item.low_stock_threshold)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {item.warehouse_location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="text-brand-500 hover:text-brand-600 font-semibold"
                          >
                            Adjust Stock
                          </button>
                          <button
                            onClick={() => openLogModal(item)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-semibold"
                          >
                            Logs
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
      )}

      {/* Variant Inventory Table */}
      {activeTab === "variants" && (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {variantLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : variantError ? (
          <div className="text-center py-10"><p className="text-error-500 font-medium">{variantError}</p></div>
        ) : variantInventory.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No variant inventory found. Create a product with variants to see them here.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {["Product", "Combination", "SKU", "Price", "Stock", "Status", "Actions"].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {variantInventory.map((v) => (
                    <tr key={v.variant_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800 dark:text-white">{v.product_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        <div className="flex flex-wrap gap-1">
                          {v.combination_label?.split(" | ").map((part, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">{part}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">{v.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white font-semibold">{v.price != null ? `₹${Number(v.price).toFixed(2)}` : "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800 dark:text-white">{v.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {v.stock === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-semibold text-error-700 dark:bg-error-950/20 dark:text-error-400">Out of Stock</span>
                        ) : v.stock <= 5 ? (
                          <span className="inline-flex items-center rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700 dark:bg-warning-950/20 dark:text-warning-400">Low Stock</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-950/20 dark:text-success-400">In Stock</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => { setSelectedVariant(v); setVariantAdjustForm({ delta: "", notes: "" }); setVariantAdjustError(null); setIsVariantAdjustOpen(true); }}
                          className="text-brand-500 hover:text-brand-600 font-semibold text-sm"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={variantPage} totalPages={variantTotalPages} onPageChange={setVariantPage} />
          </div>
        )}
      </div>
      )}


      <Modal isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} className="max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Adjust Stock
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-normal">
          Change stock level for <span className="font-bold text-gray-700 dark:text-gray-200">{selectedItem?.product_name}</span>.
        </p>
        {formError && (
          <div className="mb-4 text-sm text-error-500 bg-error-50 dark:bg-error-950/20 p-3 rounded-lg border border-error-200 dark:border-error-800">
            {formError}
          </div>
        )}
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Adjustment Quantity *
            </label>
            <input
              type="number"
              required
              value={adjustForm.changeAmount}
              onChange={(e) => setAdjustForm({ ...adjustForm, changeAmount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 font-normal"
              placeholder="e.g. +50 for restock, -5 for damage"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Reason *
            </label>
            <select
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
            >
              <option value="Restock">Restock</option>
              <option value="Sale">Sale Adjustment</option>
              <option value="Return">Return</option>
              <option value="Damage">Damage</option>
              <option value="Adjustment">General Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Notes
            </label>
            <textarea
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 h-20 resize-none font-normal"
              placeholder="Provide a reason or transaction ID reference..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Processing..." : "Submit Adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Log Modal */}
      <Modal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} className="max-w-2xl p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Stock Movement Logs
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-normal">
          Transaction logs for <span className="font-bold text-gray-700 dark:text-gray-250">{selectedItem?.product_name}</span>.
        </p>

        {logsLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 font-normal">
            No stock changes recorded yet.
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Change</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.history_id}>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-normal">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold ${log.change_amount > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-450'}`}>
                      {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-805 dark:text-white font-semibold">
                      {log.reason}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-normal max-w-xs truncate">
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
          <button
            type="button"
            onClick={() => setIsLogOpen(false)}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Variant Adjust Stock Modal */}
      <Modal isOpen={isVariantAdjustOpen} onClose={() => setIsVariantAdjustOpen(false)} className="max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Adjust Variant Stock</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-normal">
          Product: <span className="font-bold text-gray-700 dark:text-gray-200">{selectedVariant?.product_name}</span>
        </p>
        <p className="text-xs text-gray-400 mb-5">
          {selectedVariant?.combination_label} — SKU: {selectedVariant?.sku}
        </p>
        {variantAdjustError && (
          <div className="mb-4 text-sm text-error-500 bg-error-50 dark:bg-error-950/20 p-3 rounded-lg border border-error-200 dark:border-error-800">
            {variantAdjustError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Stock Delta * <span className="text-gray-400 font-normal">(+ to add, − to deduct)</span>
            </label>
            <input type="number" value={variantAdjustForm.delta}
              onChange={(e) => setVariantAdjustForm({ ...variantAdjustForm, delta: e.target.value })}
              placeholder="e.g. +50 or -5"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 font-normal" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea rows={2} value={variantAdjustForm.notes}
              onChange={(e) => setVariantAdjustForm({ ...variantAdjustForm, notes: e.target.value })}
              placeholder="Optional reason..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 resize-none font-normal" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => setIsVariantAdjustOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer">
              Cancel
            </button>
            <button disabled={variantAdjustSubmitting}
              onClick={async () => {
                const delta = parseInt(variantAdjustForm.delta);
                if (isNaN(delta) || delta === 0) { setVariantAdjustError("Enter a valid non-zero delta."); return; }
                setVariantAdjustSubmitting(true);
                setVariantAdjustError(null);
                try {
                  await api.patch(`/products/variants/${selectedVariant?.variant_id}/stock`, { delta });
                  setIsVariantAdjustOpen(false);
                  fetchVariantInventory();
                } catch (err: any) {
                  setVariantAdjustError(err.message || "Failed to adjust stock.");
                } finally {
                  setVariantAdjustSubmitting(false);
                }
              }}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer">
              {variantAdjustSubmitting ? "Updating..." : "Update Stock"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
