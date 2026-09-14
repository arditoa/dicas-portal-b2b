import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Define explicitamente esta pasta como a raiz do projeto para o Turbopack/Next.js
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;