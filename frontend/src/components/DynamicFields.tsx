"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface CustomValue {
  id: string;
  field_key: string;
  label: string;
  value: any;
  field_type: string | null;
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(url);
}

function formatCurrency(val: any): string {
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function FieldValue({ row }: { row: CustomValue }) {
  const { value, field_type } = row;

  if (value === null || value === undefined || value === "") return <span style={{ color: "#bbb" }}>—</span>;

  // Boolean
  if (field_type === "boolean" || typeof value === "boolean") {
    const yes = value === true || value === "true" || value === "Yes";
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ background: yes ? "#dcfce7" : "#fee2e2", color: yes ? "#16a34a" : "#dc2626" }}>
        {yes ? "Yes" : "No"}
      </span>
    );
  }

  // Currency
  if (field_type === "currency") {
    return <span className="font-black" style={{ color: "#2A3887" }}>{formatCurrency(value)}</span>;
  }

  // URL type — image or link
  if (field_type === "url" || (typeof value === "string" && value.startsWith("http"))) {
    const strVal = String(value);
    if (isImageUrl(strVal)) {
      return (
        <a href={strVal} target="_blank" rel="noopener noreferrer">
          <img src={strVal} alt={row.label}
            className="rounded-lg object-contain"
            style={{ maxHeight: "160px", maxWidth: "100%", background: "#f8fafc", border: "1px solid #E2F1FC" }} />
        </a>
      );
    }
    return (
      <a href={strVal} target="_blank" rel="noopener noreferrer"
        className="text-sm font-semibold underline break-all"
        style={{ color: "#29A9DF" }}>
        {strVal}
      </a>
    );
  }

  // Number / decimal
  if (field_type === "number" || field_type === "decimal") {
    return <span className="font-bold" style={{ color: "#333" }}>{Number(value).toLocaleString("en-IN")}</span>;
  }

  // Array (multiselect)
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {value.map((v: string, i: number) => (
          <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "#E2F1FC", color: "#2A3887" }}>{v}</span>
        ))}
      </div>
    );
  }

  // Default: text, textarea, select, email, phone, date
  return (
    <span className="text-sm font-semibold text-right" style={{ color: "#333", wordBreak: "break-word" }}>
      {String(value)}
    </span>
  );
}

export default function DynamicFields({ entity, entityId, excludeKeys }: { entity: "unit" | "tower" | "project"; entityId: string; entityData?: any; excludeKeys?: Set<string> }) {
  const [rows, setRows] = useState<CustomValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    fetch(`${API}/admin/fields/public-values/${entity}/${entityId}`)
      .then(r => r.ok ? r.json() : [])
      .then((values: CustomValue[]) => {
        setRows(values.filter(v => v.value !== null && v.value !== undefined && v.value !== ""));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entity, entityId]);

  const visibleRows = excludeKeys ? rows.filter(r => !excludeKeys.has(r.field_key)) : rows;

  if (loading || visibleRows.length === 0) return null;

  // Separate image/URL rows from scalar rows so images get full width
  const imageRows = visibleRows.filter(r =>
    (r.field_type === "url" || (typeof r.value === "string" && r.value.startsWith("http")))
    && typeof r.value === "string" && isImageUrl(r.value)
  );
  const scalarRows = visibleRows.filter(r => !imageRows.includes(r));

  return (
    <div className="rounded-2xl p-6" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
      <h2 className="font-black text-lg mb-4" style={{ color: "#262262" }}>Additional Details</h2>

      {/* Scalar fields — 2-column table */}
      {scalarRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 mb-4">
          {scalarRows.map((row, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 gap-4"
              style={{ borderBottom: "1px solid #E2F1FC" }}>
              <span className="text-sm flex-shrink-0" style={{ color: "#888" }}>{row.label}</span>
              <FieldValue row={row} />
            </div>
          ))}
        </div>
      )}

      {/* Image / URL fields — full width cards */}
      {imageRows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {imageRows.map((row, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: "#888" }}>{row.label}</p>
              <FieldValue row={row} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
