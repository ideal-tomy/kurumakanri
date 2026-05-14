'use client';

export function PrintButton({ label = 'PDFとして保存' }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-primary no-print"
      style={{ marginBottom: 12 }}
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
