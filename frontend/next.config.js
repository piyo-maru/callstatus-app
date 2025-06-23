/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Server Components関連の問題を解決するための設定
  experimental: {
    // サーバーコンポーネントのランタイムを安定化
    serverComponentsExternalPackages: [],
    // 開発環境でのバンドル問題を回避
    turbo: undefined,
  },
  // 開発環境でのWebpackキャッシュを無効化して問題を回避
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 開発環境でのキャッシュ問題を回避
      config.cache = false;
      
      // React Server Componentsのマニフェスト問題を回避
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      
      // 開発環境でのmodule resolution改善
      config.resolve.symlinks = false;
    }
    return config;
  },
  // TypeScriptの厳密性を緩和
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLintエラーを無視しない
  eslint: {
    ignoreDuringBuilds: false,
  },
  // 出力設定を明示
  output: 'standalone',
  // APIプロキシ設定（CORSを回避）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:3002/api/:path*', // Docker内部通信
      },
    ];
  },
  // 開発環境での追加設定
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // ページが読み込まれてからメモリに保持する時間
      maxInactiveAge: 25 * 1000,
      // 同時にメモリに保持するページ数
      pagesBufferLength: 2,
    },
  }),
}

module.exports = nextConfig