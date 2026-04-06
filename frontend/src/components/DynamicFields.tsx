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
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}
function isPdfUrl(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url);
}
function isMediaPath(url: string): boolean {
  return typeof url === "string" && (url.startsWith("/media/") || url.startsWith("http"));
}
function encodeMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith("http")) return url;
  return url.split('/').map(s => encodeURIComponent(s)).join('/');
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

  // URL or media path — image, video, pdf, or link
  if (field_type === "url" || (typeof value === "string" && isMediaPath(value))) {
    const strVal = String(value);
    const encoded = encodeMediaUrl(strVal);
    if (isImageUrl(strVal)) {
      return (
        <a href={encoded} target="_blank" rel="noopener noreferrer">
          <img src={encoded} alt={row.label}
            className="rounded-lg object-contain"
            style={{ maxHeight: "160px", maxWidth: "100%", background: "#f8fafc", border: "1px solid #E2F1FC" }} />
        </a>
      );
    }
    if (isVideoUrl(strVal)) {
      return (
        <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9", background: "#111", maxWidth: "100%" }}>
          <video src={encoded} controls className="w-full h-full object-contain" />
        </div>
      );
    }
    if (isPdfUrl(strVal)) {
      return (
        <a href={encoded} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:shadow-md transition-shadow"
          style={{ background: "#fff", border: "1px solid #E2F1FC" }}>
          <span className="text-2xl">📄</span>
          <span className="text-sm font-semibold" style={{ color: "#2A3887" }}>View PDF</span>
        </a>
      );
    }
    return (
      <a href={encoded} target="_blank" rel="noopener noreferrer"
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

  // Separate media rows (images, videos, pdfs) from scalar rows so they get full width
  const mediaRows = visibleRows.filter(r =>
    typeof r.value === "string" && isMediaPath(r.value)
    && (isImageUrl(r.value) || isVideoUrl(r.value) || isPdfUrl(r.value))
  );
  const scalarRows = visibleRows.filter(r => !mediaRows.includes(r));

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

      {/* Media fields — full width cards */}
      {mediaRows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {mediaRows.map((row, i) => (
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
