"use client";

import React, { useState, useMemo } from "react";
import { THEME } from "@/styles/theme";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  onRowClick?: (item: T, index: number) => void;
  selectedId?: string;
  idKey?: keyof T;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search records...",
  searchKeys = [],
  onRowClick,
  selectedId,
  idKey = "id",
  pageSize = 25,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) => {
      if (searchKeys.length > 0) {
        return searchKeys.some((k) =>
          String(item[k] ?? "").toLowerCase().includes(term)
        );
      }
      return Object.values(item).some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchKeys]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = String(a[sortKey] ?? "").toLowerCase();
      const valB = String(b[sortKey] ?? "").toLowerCase();
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }
      return sortDir === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Top Search Bar & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className={`${THEME.surface.input} pl-9`}
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{sortedData.length}</span> of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{data.length}</span> records
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 whitespace-nowrap"
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1.5 cursor-pointer select-none group">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                >
                  No records found matching your search
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => {
                const isSelected = selectedId && item[idKey] === selectedId;
                return (
                  <tr
                    key={String(item[idKey] ?? idx)}
                    onClick={() => onRowClick && onRowClick(item, idx)}
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""
                    } ${isSelected ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-600" : ""}`}
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                        {col.render
                          ? col.render(item, idx)
                          : String(item[col.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
