"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface Customer {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: 'Active' | 'Inactive' | 'Banned';
  created_at: string;
  last_login: string | null;
  total_orders: number;
  total_spent: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  // Change Status Modal
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statusForm, setStatusForm] = useState({ status: "Active" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      if (search.trim()) {
        params.append("search", search.trim());
      }
      const res: any = await api.get(`/customers?${params.toString()}`);
      if (res.success && res.data) {
        setCustomers(res.data.data);
        if (res.data.total) {
          setTotalPages(Math.max(1, Math.ceil(res.data.total / limit)));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  const openStatusModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStatusForm({ status: customer.status });
    setIsStatusOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);

    try {
      await api.patch(`/customers/${selectedCustomer.user_id}/status`, {
        status: statusForm.status
      });
      setIsStatusOpen(false);
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update customer status.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-750 dark:bg-success-950/20 dark:text-success-450">
            Active
          </span>
        );
      case "Inactive":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-650 dark:bg-gray-800 dark:text-gray-400">
            Inactive
          </span>
        );
      case "Banned":
        return (
          <span className="inline-flex items-center rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-semibold text-error-750 dark:bg-error-950/20 dark:text-error-450">
            Banned
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Customer Directory
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            View profiles, oversee engagement history, and manage access privileges.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-white/[0.03] p-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs">
        <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
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

      {/* Customers Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No customers found.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email / Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total Spent
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
                  {customers.map((customer) => (
                    <tr key={customer.user_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="block font-bold text-gray-805 dark:text-white text-sm">
                          {customer.first_name} {customer.last_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        <span className="block font-medium">{customer.email}</span>
                        {customer.phone && <span className="block text-xs mt-0.5">{customer.phone}</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-bold">
                        {customer.total_orders} orders
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-500 font-bold">
                        ${customer.total_spent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(customer.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openStatusModal(customer)}
                          className="text-brand-500 hover:text-brand-600 font-semibold"
                        >
                          Modify Access
                        </button>
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

      {/* Change Status Modal */}
      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} className="max-w-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Modify Account Status
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-normal">
          Change status for <span className="font-bold text-gray-700 dark:text-gray-250">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</span>.
        </p>
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Access Privileges
            </label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ status: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
            >
              <option value="Active">Active / Approved</option>
              <option value="Inactive">Inactive / Suspended</option>
              <option value="Banned">Banned / Revoked</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={() => setIsStatusOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Updating..." : "Save Status"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
