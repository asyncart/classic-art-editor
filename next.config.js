const withBundleAnalyzer = require('next-bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  /**
   * React in strict mode runs effects twice.
   * This is an issue because we make 2x requests to RPC provider + IPFS and also download 2x bandwith which makes development very slow.
   * MetaMask uses Cloudflare (cloudflare-eth.com) as RPC provider which often rate limits developer's machine due to large number of requests.
   */
  reactStrictMode: false,
  webpack: (config) => {
    // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
