/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  distDir: ".next",
  // ページルーティングの設定
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  // 他の設定があればここに追加
};

module.exports = nextConfig;
