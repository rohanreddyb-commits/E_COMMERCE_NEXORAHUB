"use client";
import React from "react";
import { BoxIconLine, GroupIcon } from "@/icons";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
}

export const EcommerceMetrics: React.FC<{ stats: Stats | null }> = ({ stats }) => {
  const formatRevenue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const metrics = [
    {
      title: "Total Revenue",
      value: stats ? formatRevenue(stats.totalRevenue) : "$0.00",
      icon: (
        <svg className="text-gray-800 size-6 dark:text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Total Orders",
      value: stats ? stats.totalOrders.toLocaleString() : "0",
      icon: <BoxIconLine className="text-gray-800 dark:text-white/90" />,
    },
    {
      title: "Total Customers",
      value: stats ? stats.totalCustomers.toLocaleString() : "0",
      icon: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
    },
    {
      title: "Total Products",
      value: stats ? stats.totalProducts.toLocaleString() : "0",
      icon: (
        <svg className="text-gray-800 size-6 dark:text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 w-full">
      {metrics.map((metric, idx) => (
        <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-theme-xs">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {metric.icon}
          </div>
          <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {metric.title}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metric.value}
            </h4>
          </div>
        </div>
      ))}
    </div>
  );
};
