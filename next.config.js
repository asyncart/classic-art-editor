/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  webpack: config => {
    // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig
