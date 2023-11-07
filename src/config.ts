// @ts-ignore
export const ACTIVE_NETWORK: 1 | 5 = Number(
  process.env.NEXT_PUBLIC_ACTIVE_NETWORK
);

export const __PROD__ = ACTIVE_NETWORK === 1;

export const V1_CONTRACT_ADDRESS = __PROD__
  ? '0x6c424c25e9f1fff9642cb5b7750b0db7312c29ad'
  : null;

export const V2_CONTRACT_ADDRESS = __PROD__
  ? '0xb6dae651468e9593e4581705a09c10a76ac1e0c8'
  : '0xbb4ec6f77f8ab3232abb22893def072c9a848bed';
