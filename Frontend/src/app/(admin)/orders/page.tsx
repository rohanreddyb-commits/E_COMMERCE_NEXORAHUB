"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/common/Pagination";

interface Order {
  orderId: number;
  customerName: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  date: string;
}

interface OrderItem {
  itemId: number;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetails {
  order_id: number;
  user_id: number;
  address_id: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  coupon_code: string | null;
  order_status: string;
  payment_status: string;
  created_at: string;
  address: {
    title: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
  };
  items: OrderItem[];
  payment: {
    transactionId: string;
    method: string;
    status: string;
    date: string;
  } | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const itemsPerPage = 10;

  // View Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Edit Status Modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [statusForm, setStatusForm] = useState({ orderStatus: "", paymentStatus: "" });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders/admin/all");
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openDetails = async (orderId: number) => {
    setDetailsLoading(true);
    setIsDetailsOpen(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.success && res.order) {
        setSelectedOrder(res.order);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to load order details.");
      setIsDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openEditStatus = (order: Order) => {
    setEditingOrder(order);
    setStatusForm({
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    });
    setIsEditOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setSubmitting(true);

    try {
      await api.put(`/orders/admin/${editingOrder.orderId}`, statusForm);
      setIsEditOpen(false);
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update order status.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    return statusFilter === "" || order.orderStatus === statusFilter;
  });

  // Local Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getOrderStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-warning-50 text-warning-700 dark:bg-warning-950/20 dark:text-warning-400";
      case "Paid":
      case "Processing":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400";
      case "Shipped":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400";
      case "Delivered":
        return "bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400";
      case "Cancelled":
        return "bg-error-50 text-error-700 dark:bg-error-950/20 dark:text-error-400";
      default:
        return "bg-gray-50 text-gray-750 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Success":
        return "bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400";
      case "Pending":
        return "bg-warning-50 text-warning-700 dark:bg-warning-950/20 dark:text-warning-400";
      case "Failed":
        return "bg-error-50 text-error-700 dark:bg-error-950/20 dark:text-error-400";
      default:
        return "bg-gray-50 text-gray-750 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Order Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            View transaction histories, update shipping, and verify payment states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2 text-sm text-gray-850 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
          >
            <option value="">All Orders</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-error-500 font-medium">{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No orders found.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Order Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {currentOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-white">
                        #{order.orderId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-semibold">
                        {order.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-normal">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-bold">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getOrderStatusBadgeClass(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPaymentStatusBadgeClass(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openDetails(order.orderId)}
                            className="text-brand-500 hover:text-brand-600 font-semibold"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => openEditStatus(order)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-semibold"
                          >
                            Update
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

      {/* Order Details Modal */}
      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} className="max-w-2xl p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-5">
          Order Details
        </h2>
        {detailsLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : selectedOrder ? (
          <div className="space-y-6">
            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl text-sm border border-gray-150 dark:border-gray-800 font-normal">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Order ID</span>
                <span className="font-bold text-gray-800 dark:text-white">#{selectedOrder.order_id}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Date Placed</span>
                <span className="text-gray-800 dark:text-white">{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Order Status</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getOrderStatusBadgeClass(selectedOrder.order_status)}`}>
                  {selectedOrder.order_status}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Payment Status</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getPaymentStatusBadgeClass(selectedOrder.payment_status)}`}>
                  {selectedOrder.payment_status}
                </span>
              </div>
            </div>

            {/* Items Purchased */}
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-md mb-2">Items Purchased</h3>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50/50 dark:bg-gray-900/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.itemId}>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-white font-semibold">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-normal">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-normal">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-white font-bold text-right">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Shipping info */}
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">Shipping Address</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-normal">
                    <span className="font-semibold text-gray-750 dark:text-gray-300">{selectedOrder.address.title}</span><br />
                    {selectedOrder.address.street}, {selectedOrder.address.city}, {selectedOrder.address.state}<br />
                    {selectedOrder.address.postal_code}, {selectedOrder.address.country}<br />
                    Phone: {selectedOrder.address.phone}
                  </p>
                </div>
                {/* Transaction details */}
                {selectedOrder.payment && (
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-sm">Payment Detail</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-normal">
                      Method: {selectedOrder.payment.method}<br />
                      Txn ID: <span className="font-mono text-xs">{selectedOrder.payment.transactionId}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Order total math */}
              <div className="bg-gray-50/50 dark:bg-gray-900/10 p-4 rounded-xl border border-gray-150 dark:border-gray-800 text-sm space-y-2 font-normal">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-800 dark:text-white">${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-success-600 dark:text-success-400">
                    <span>Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ""}</span>
                    <span>-${selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-2 flex justify-between font-bold text-md">
                  <span className="text-gray-800 dark:text-white">Total Amount</span>
                  <span className="text-brand-500">${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit Status Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} className="max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-5">
          Update Order Status
        </h2>
        {editingOrder && (
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Order Status
              </label>
              <select
                value={statusForm.orderStatus}
                onChange={(e) => setStatusForm({ ...statusForm, orderStatus: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-805 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Status
              </label>
              <select
                value={statusForm.paymentStatus}
                onChange={(e) => setStatusForm({ ...statusForm, paymentStatus: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-805 dark:text-white focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="Pending">Pending</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
