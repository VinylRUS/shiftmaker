import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Обычный вывод: продакшен-запуск через `next start` (см. Dockerfile).
  // Standalone-режим не нужен: на Bothost образ собирается целиком.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    // Короткий алиас для проверок платформы и мониторинга:
    // https://домен/health -> /api/health
    return [{ source: "/health", destination: "/api/health" }];
  },
};

export default nextConfig;
