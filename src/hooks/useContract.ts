import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { V1_CONTRACT_ADDRESS } from '@/config';
import { useMemo } from 'react';
import { isAddress } from 'viem';
import { Address, useWalletClient } from 'wagmi';
import { getContract } from 'wagmi/actions';

export default function useContract(address: Address) {
  const { data: walletClient } = useWalletClient();
  const abi = address === V1_CONTRACT_ADDRESS ? v1Abi : v2Abi;

  return useMemo(
    () =>
      isAddress(address) && !!abi && !!walletClient
        ? getContract({ address, abi, walletClient })
        : undefined,
    [address, abi, walletClient],
  );
}
