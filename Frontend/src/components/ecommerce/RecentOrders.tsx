"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Pagination from "../tables/Pagination";
import { api } from "../../utils/api";

interface Order {
  orderId: number;
  customerName: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  date: string;
}

export default function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Call the backend API for all admin orders
        const data = await api.get("/orders/admin/all");
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        } else {
          setOrders([]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch orders.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const totalPages = Math.max(1, Math.ceil(orders.length / rowsPerPage));
  
  // Reset to first page if rows per page changes
  const handleRowsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = orders.slice(startIndex, startIndex + rowsPerPage);

  const getStatusColor = (status: string) => {
    if (status === "Delivered" || status === "Paid") return "success";
    if (status === "Pending" || status === "Processing") return "warning";
    return "error";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Orders
          </h3>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto min-h-[250px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-gray-500 text-sm">Loading orders...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-red-500 text-sm">{error}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-gray-500 text-sm">No orders found.</span>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Order ID</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Customer</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentData.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    #{order.orderId}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {order.customerName}
                  </TableCell>
                  <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    ${Number(order.total).toFixed(2)}
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    <Badge size="sm" color={getStatusColor(order.orderStatus)}>
                      {order.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {new Date(order.date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Footer - visible only when we have data */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 border-t border-gray-100 dark:border-white/[0.05] gap-4 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Show</span>
            <select
              value={rowsPerPage}
              onChange={handleRowsChange}
              className="h-9 px-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">rows</span>
          </div>
          
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
