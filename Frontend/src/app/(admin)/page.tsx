"use client";
import React, { useEffect, useState } from "react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import { api } from "@/utils/api";
import { useAuth } from "@/context/AuthContext";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get("/admin/dashboard");
        if (res.success && res.stats) {
          setStats(res.stats);
        } else {
          setError("Failed to fetch dashboard statistics.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Error connecting to the API server.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
          Welcome back, {user?.name || "Admin"}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
          Here is what is happening with your store today.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl">
          <p className="text-error-500 font-medium">{error}</p>
        </div>
      ) : (
        <EcommerceMetrics stats={stats} />
      )}
      
      {/* Quick Action Info or Dashboard Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs space-y-3">
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">Store Administration</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            Use the sidebar navigation to manage your store's inventory, organize product categories, view and update customer orders, and create promotional discount coupons.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs space-y-3">
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">Database Connected</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            All data shown here and on management pages is served directly from your Microsoft SQL Server (MSSQL) database through the secure Node.js Express API.
          </p>
        </div>
      </div>
    </div>
  );
}
