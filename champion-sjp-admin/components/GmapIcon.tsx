// Ikon pin Google Maps (inline SVG multi-warna Google) — tanpa aset eksternal, aman CSP.
export default function GmapIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="inline-block align-[-2px]">
      <path fill="#4285F4" d="M12 2c-3.9 0-7 3.1-7 7 0 1.4.4 2.6 1 3.7L12 22l6-9.3c.6-1.1 1-2.3 1-3.7 0-3.9-3.1-7-7-7z" />
      <path fill="#34A853" d="M6 12.7 12 22l3.2-5c-.9.6-2 1-3.2 1-2.6 0-4.8-1.7-5.6-4a7 7 0 0 0 .6.7z" opacity=".85" />
      <path fill="#FBBC04" d="M5 8.6C5.5 6 7.5 4 10 3.3 8 4.2 6.6 6 6.1 8.2c-.4 1.6-.2 2.9.3 4.1a7 7 0 0 1-1.4-3.7z" opacity=".9" />
      <path fill="#EA4335" d="M12 2c1.9 0 3.6.8 4.9 2C15.7 2.7 14 2 12 2 9.5 2.7 7.5 4.7 7 7.3 7.8 4.5 9.7 2.6 12 2z" opacity=".9" />
      <circle cx="12" cy="9" r="2.5" fill="#fff" />
    </svg>
  );
}
