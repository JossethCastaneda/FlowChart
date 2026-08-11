"use client";
import React, { useEffect, useState } from "react";

export interface ColumnDef<T> {
  key: string | keyof T;
  title: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string | number;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
}

export function DataTable<T>({ columns, data, loading, emptyText = "Sin datos" }: DataTableProps<T>) {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  useEffect(() => {
    // Load preference from somewhere or default to comfortable
    // For now we'll just use a local state that could be linked to localStorage
    const saved = localStorage.getItem("fc-density");
    if (saved === "compact" || saved === "comfortable") {
      setDensity(saved);
    }
  }, []);

  return (
    <div className="fc-datatable-wrapper" data-density={density}>
      <table className="fc-datatable">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={String(col.key)} 
                className={`fc-datatable-th fc-datatable-th--${col.align || "left"} ${index === 0 ? "fc-datatable-th--sticky" : ""}`}
                style={{ width: col.width }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="fc-datatable-td fc-datatable-td--loading">
                <div className="fc-skeleton-rect" style={{ width: "100%", height: "20px", borderRadius: "4px" }} />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="fc-datatable-td fc-datatable-td--empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td 
                    key={String(col.key)} 
                    className={`fc-datatable-td fc-datatable-td--${col.align || "left"} ${colIndex === 0 ? "fc-datatable-td--sticky fc-datatable-td--first" : ""}`}
                  >
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
