/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Server Components関連の問題を解決するための設定
  experimental: {
    // サーバーコンポーネントのランタイムを安定化
    serverComponentsExternalPackages: [],
    // 開発環境でのバンドル問題を回避
    turbo: undefined,
    // メモリ効率向上のための設定
    ...(process.env.NODE_ENV === 'development' && {
      cpus: 1,
      memoryBasedWorkersCount: false,
    }),
  },
  // メモリ効率を考慮したWebpack設定
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // メモリ効率のためキャッシュを有効化（typeエラーが発生する場合のみ無効化）
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
      
      // React Server Componentsのマニフェスト問題を回避
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      
      // 開発環境でのmodule resolution改善
      config.resolve.symlinks = false;
      
      // メモリ使用量を制限
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 244000,
        },
      };
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
  // 開発環境での追加設定（メモリ効率向上）
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // ページが読み込まれてからメモリに保持する時間（短縮）
      maxInactiveAge: 15 * 1000,
      // 同時にメモリに保持するページ数（最小限）
      pagesBufferLength: 1,
    },
  }),
}

module.exports = nextConfig