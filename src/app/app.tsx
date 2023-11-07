'use client';

import { __PROD__ } from '@/config';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { goerli, mainnet } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

const { chains, publicClient } = configureChains(
  [__PROD__ ? mainnet : goerli],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Async Classic Art Editor',
  projectId: __PROD__
    ? 'fe5ade2ca72bf579c0f012ed91b1ddc4'
    : '515550cbf8f0d8aa47b342421d167450',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>{children}</RainbowKitProvider>
    </WagmiConfig>
  );
}
