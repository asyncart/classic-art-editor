import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { Modal } from '@/components/common/modal';
import Spinner from '@/components/common/spinner';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS } from '@/config';
import { LayerArtNFTMetadata } from '@/types/shared';
import { getErrorMessage } from '@/utils/common';
import {
  fetchIpfs,
  getCustomIPFSGateway,
  setCustomIPFSGateway,
} from '@/utils/ipfs';
import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle } from 'react-feather';
import { Address } from 'viem';
import { useWalletClient } from 'wagmi';
import { getContract } from 'wagmi/actions';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

type LayerArtInfo = {
  tokenAddress: Address;
  tokenId: number;
  tokenURI: string;
};

export default function LayerArtChanger({
  onClose,
}: {
  onClose: VoidFunction;
}) {
  const [artInfo, setArtInfo] = useState<LayerArtInfo>();

  if (!artInfo)
    return (
      <Modal title="Change Layer Artwork" onClose={onClose}>
        <FormScreen onSubmit={setArtInfo} />
      </Modal>
    );

  return (
    <ChangeModal
      tokenId={artInfo.tokenId}
      tokenURI={artInfo.tokenURI}
      tokenAddress={artInfo.tokenAddress}
      onClose={onClose}
    />
  );
}

type FormScreenProps = {
  onSubmit: (artInfo: LayerArtInfo) => void;
};

function FormScreen({ onSubmit }: FormScreenProps) {
  const [state, setState] = useState<
    'default' | 'loading' | 'token404' | 'error'
  >('default');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('loading');

    // @ts-ignore
    const tokenId = Number(e.target.tokenId.value);
    // @ts-ignore
    const tokenAddress = e.target.tokenAddress.value as Address;
    // @ts-ignore
    setCustomIPFSGateway(e.target.ipfsGatewayURL.value);

    const contract = getContract({
      address: tokenAddress,
      abi: tokenAddress === V1_CONTRACT_ADDRESS ? v1Abi : v2Abi,
    });

    try {
      const tokenURI = await contract.read.tokenURI([BigInt(tokenId)]);
      // V1 contract won't fail for non existent token, it will just return an empty string.
      if (!tokenURI) throw new Error('URI query for nonexistent token');

      // controlTokens exist for layers, this means it's layer token
      const controlTokens = await contract.read
        .getControlToken([BigInt(tokenId)])
        .catch(() => null);

      if (!controlTokens) throw new Error('URI query for nonexistent token');
      onSubmit({ tokenAddress, tokenId, tokenURI });
    } catch (error) {
      const message = getErrorMessage(error);
      const is404 = message.includes('URI query for nonexistent token');
      setState(is404 ? 'token404' : 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="tokenAddress" className="text-sm font-bold">
          Token Address
        </label>
        <select
          required
          className="mt-1"
          name="tokenAddress"
          defaultValue={V2_CONTRACT_ADDRESS}
        >
          {V1_CONTRACT_ADDRESS && (
            <option value={V1_CONTRACT_ADDRESS}>V1 Artwork</option>
          )}
          <option value={V2_CONTRACT_ADDRESS}>V2 Artwork</option>
        </select>
      </div>
      <div className="mt-2">
        <label htmlFor="tokenId" className="text-sm font-bold">
          Layer Token ID
        </label>
        <input
          type="number"
          min={0}
          step={1}
          required
          id="tokenId"
          name="tokenId"
          className="mt-1"
          placeholder="289"
        />
      </div>
      <div className="mt-2">
        <label htmlFor="ipfsGatewayURL" className="text-sm font-bold">
          IPFS Gateway (Optional)
        </label>
        <input
          type="url"
          id="ipfsGatewayURL"
          name="ipfsGatewayURL"
          className="mt-1"
          placeholder="https://ipfs.io"
          defaultValue={getCustomIPFSGateway()}
        />
      </div>
      <button
        disabled={state === 'loading'}
        className="btn btn-black w-full mt-4"
      >
        Find Token
      </button>
      {(state === 'token404' || state === 'error') && (
        <p className="text-red text-sm text-center mt-3">
          {state === 'token404'
            ? 'Invalid layer token id provided.'
            : 'Unexpected error occured. Please try again.'}
        </p>
      )}
    </form>
  );
}

function ChangeModal({
  tokenId,
  tokenURI,
  tokenAddress,
  onClose,
}: LayerArtInfo & { onClose: VoidFunction }) {
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<
    'default' | 'loading' | 'success' | { error: string }
  >('default');

  const [title, setTitle] = useState<string>();
  const [imageSrc, setImageSrc] = useState<string>();
  const [controls, setControls] = useState<LayerArtNFTMetadata['controls']>();
  const [controlTokenValues, setControlTokenValues] =
    useState<readonly bigint[]>();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('loading');

    const { changedControlsLeverIds, changedControlsValues } =
      controls!.reduce<{
        changedControlsLeverIds: bigint[];
        changedControlsValues: bigint[];
      }>(
        (data, _, index) => {
          const controlValue = e.currentTarget.querySelector<HTMLInputElement>(
            `#c${index}`,
          )!.value;

          const isControlChanged =
            controlValue !== String(controlTokenValues![2 + index * 3]);

          if (isControlChanged) {
            data.changedControlsLeverIds.push(BigInt(index));
            data.changedControlsValues.push(BigInt(controlValue));
          }

          return data;
        },
        {
          changedControlsLeverIds: [],
          changedControlsValues: [],
        },
      );

    if (changedControlsLeverIds.length === 0)
      return setState({ error: "Values haven't been changed." });

    const contract = getContract({
      address: tokenAddress,
      abi: tokenAddress === V1_CONTRACT_ADDRESS ? v1Abi : v2Abi,
    });

    try {
      const owner = await contract.read.ownerOf([BigInt(tokenId)]);
      if (owner.toLowerCase() !== walletClient?.account.address.toLowerCase())
        return setState({ error: `Your wallet doesn't own token ${tokenId}.` });

      const { request } = await contract.simulate.useControlToken([
        BigInt(tokenId),
        changedControlsLeverIds,
        changedControlsValues,
      ]);
      await walletClient?.writeContract(request);
      setState('success');
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes('User rejected')) return setState('default');

      console.error(error);
      setState({ error: 'Unexpected error occured. Please try again.' });
    }
  };

  const initializeControls = async () => {
    const layerMetadataResponse = await fetchIpfs(tokenURI);
    const layerMetadata =
      (await layerMetadataResponse.json()) as LayerArtNFTMetadata;

    const contract = getContract({
      address: tokenAddress,
      abi: tokenAddress === V1_CONTRACT_ADDRESS ? v1Abi : v2Abi,
    });

    const controlTokenValues = await contract.read.getControlToken([
      BigInt(tokenId),
    ]);

    let controls =
      layerMetadata.controls ||
      // @ts-ignore
      (await import('@/layer-controls.json'))[`${tokenAddress}-${tokenId}`];

    setTitle(layerMetadata.name);
    setControls(controls);
    setControlTokenValues(controlTokenValues);

    const imageResponse = await fetchIpfs(layerMetadata.image);
    const imageBlob = await imageResponse.blob();
    setImageSrc(URL.createObjectURL(imageBlob));
  };

  useEffect(() => {
    initializeControls();
  }, []);

  if (state === 'success')
    return (
      <Modal onClose={onClose}>
        <CheckCircle size={48} className="text-green mx-auto" />
        <p className="text-center font-bold mt-2">Success</p>
        <p className="w-80 text-center mx-auto mt-2">
          Transaction submitted and should be processed within a minute.
        </p>
        <Confetti />
      </Modal>
    );

  if (!controls || !controlTokenValues)
    return (
      <Modal title="Change Layer Artwork" onClose={onClose}>
        <Spinner size={70} className="text-purple mx-auto mt-6 mb-4" />
        <p className="text-center break-all">Loading NFT metadata...</p>
      </Modal>
    );

  return (
    <Modal
      title={
        <>
          <span className="whitespace-nowrap mr-3">Token ID: {tokenId}</span>
          <span className="inline-block text-grey2 pr-8 break-all">
            {title}
          </span>
        </>
      }
      titleClassName="font-bold"
      onClose={onClose}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={title} className="max-w-72 max-h-48 mx-auto" />
      ) : (
        <div className="size-48 bg-grey2 mx-auto rounded animate-pulse" />
      )}
      <form onSubmit={handleSubmit} className="space-y-3 mt-5">
        {controls.map((control, index) =>
          control.controlType === 'STATE' ? (
            <div key={index}>
              <label
                htmlFor={`c${index}`}
                className="block text-sm font-bold mb-1"
              >
                {control.label}
              </label>
              <select
                id={`c${index}`}
                name={`c${index}`}
                defaultValue={Number(controlTokenValues[2 + index * 3])}
              >
                {control.stateLabels.map((stateLabel, index) => (
                  <option key={index} value={index}>
                    {stateLabel}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div key={index}>
              <label
                htmlFor={`c${index}`}
                className="block text-sm font-bold mb-1"
              >
                {control.label}
              </label>
              <input
                id={`c${index}`}
                name={`c${index}`}
                type="number"
                min={control.minValue}
                max={control.maxValue}
                defaultValue={Number(controlTokenValues[2 + index * 3])}
              />
              <p className="text-xs mt-1 opacity-50">
                Min: {control.minValue}, Max: {control.maxValue}
              </p>
            </div>
          ),
        )}
        <button
          disabled={state === 'loading'}
          className="btn btn-black w-full !mt-4"
        >
          Update Layer
        </button>
        {typeof state === 'object' && (
          <p className="text-red text-sm text-center mt-3">{state.error}</p>
        )}
      </form>
    </Modal>
  );
}
