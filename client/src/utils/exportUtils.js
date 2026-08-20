import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const fmt = (t) => (t ? new Date(t).toLocaleTimeString() : "-");
const today = () => new Date().toLocaleString();

const HEADERS = [
  "Pass Code",
  "Visitor Name",
  "Phone",
  "Email",
  "Company",
  "Host Employee",
  "Department",
  "Visit Date",
  "Expected Time",
  "Purpose",
  "Govt ID Type",
  "Govt ID Number",
  "Status",
  "Check-In",
  "Check-Out",
  "Remarks",
];

const rows = (visitors) =>
  visitors.map((v) => [
    v.passCode,
    v.fullName,
    v.phone || "-",
    v.email,
    v.company || "-",
    v.employeeName || v.employee?.name || "-",
    v.employee?.department || "-",
    v.visitDate,
    v.expectedTime || "-",
    v.purpose || "-",
    v.govtIdType || "-",
    v.govtIdNumber || "-",
    v.status,
    fmt(v.checkInTime),
    fmt(v.checkOutTime),
    v.remarks || "-",
  ]);

const summarySheet = (summary, rangeLabel) => [
  ["VISITOR REPORT SUMMARY"],
  [],
  ["Report Range", rangeLabel || "All"],
  ["Generated", today()],
  [],
  ["STATUS", "COUNT"],
  ["Total", summary.total || 0],
  ["Pending", summary.pending || 0],
  ["Approved", summary.approved || 0],
  ["Checked In", summary.checkedIn || 0],
  ["Checked Out", summary.checkedOut || 0],
  ["Rejected", summary.rejected || 0],
];

// ─── CSV ─────────────────────────────────────────────────────
export const exportToCSV = (visitors, _summary, filename = "visitor_report") => {
  const escape = (v) => {
    const s = String(v ?? "-");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [HEADERS.map(escape).join(","), ...rows(visitors).map((r) => r.map(escape).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  download(blob, `${filename}.csv`);
};

// ─── Excel ───────────────────────────────────────────────────
export const exportToExcel = (visitors, summary, filename = "visitor_report", rangeLabel = "") => {
  const wb = XLSX.utils.book_new();

  const sh1 = XLSX.utils.aoa_to_sheet(summarySheet(summary, rangeLabel));
  sh1["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, sh1, "Summary");

  const sh2 = XLSX.utils.aoa_to_sheet([HEADERS, ...rows(visitors)]);
  sh2["!cols"] = HEADERS.map((_, i) => ({ wch: [18, 20, 14, 28, 22, 20, 16, 12, 12, 30, 14, 18, 12, 10, 10, 24][i] || 14 }));
  XLSX.utils.book_append_sheet(wb, sh2, "Visitors");

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ─── PDF ─────────────────────────────────────────────────────
export const exportToPDF = (visitors, summary, filename = "visitor_report", rangeLabel = "") => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(33, 37, 41);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Visitor Pass Management — Report", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Range: ${rangeLabel || "All"}   |   Generated: ${today()}`, 14, 20);

  // Summary badges row
  const badges = [
    { label: "Total", value: summary.total || 0, color: [55, 65, 81] },
    { label: "Pending", value: summary.pending || 0, color: [234, 179, 8] },
    { label: "Approved", value: summary.approved || 0, color: [22, 163, 74] },
    { label: "Checked In", value: summary.checkedIn || 0, color: [37, 99, 235] },
    { label: "Checked Out", value: summary.checkedOut || 0, color: [107, 114, 128] },
    { label: "Rejected", value: summary.rejected || 0, color: [220, 38, 38] },
  ];

  let bx = 14;
  const by = 34;
  badges.forEach(({ label, value, color }) => {
    doc.setFillColor(...color);
    doc.roundedRect(bx, by, 40, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), bx + 4, by + 8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), bx + 4, by + 12);
    bx += 44;
  });

  // Data table
  const body = rows(visitors);
  doc.autoTable({
    startY: by + 20,
    head: [HEADERS],
    body,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [33, 37, 41], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      10: { cellWidth: 14 },
      12: { cellWidth: 16, fontStyle: "bold" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 12) {
        const c = { CHECKED_IN: [37, 99, 235], APPROVED: [22, 163, 74], CHECKED_OUT: [107, 114, 128], REJECTED: [220, 38, 38], PENDING: [234, 179, 8] };
        data.cell.styles.textColor = c[data.cell.raw] || [0, 0, 0];
      }
    },
    margin: { left: 14, right: 14 },
    didDrawPage({ pageNumber }) {
      const total = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber} of ${total}`, pageW - 30, doc.internal.pageSize.getHeight() - 5);
    },
  });

  doc.save(`${filename}.pdf`);
};

// ─── Helper ──────────────────────────────────────────────────
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
