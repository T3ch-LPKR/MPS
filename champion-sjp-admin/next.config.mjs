/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg"],
    serverActions: { bodySizeLimit: "4mb" },
  },
};
export default nextConfig;
