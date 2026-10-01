/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "pdfkit"], // pdfkit: jangan di-bundle agar font .afm bawaan tetap terbaca
    serverActions: { bodySizeLimit: "4mb" },
  },
};
export default nextConfig;
