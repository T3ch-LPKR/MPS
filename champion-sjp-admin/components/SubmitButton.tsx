"use client";

import { useFormStatus } from "react-dom";

// Spinner CSS murni (tanpa gambar/gif) — ringan, warna ikut teks tombol.
export default function SubmitButton({
  children, className = "btn", pendingText = "Memproses…",
}: {
  children: React.ReactNode; className?: string; pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
          {pendingText}
        </span>
      ) : children}
    </button>
  );
}
