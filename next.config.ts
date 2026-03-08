import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Railway build sırasında "secret not found" hatasını önlemek için varsayılanlar
    NEXT_PUBLIC_PYTHON_API_URL:
      process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://primest-ai-production.up.railway.app",
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "https://natural-quietude-production-9e7a.up.railway.app",
  },
};

export default nextConfig;
