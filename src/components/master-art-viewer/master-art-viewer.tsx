import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { Modal, ModalSkeleton } from '@/components/common/modal';
import Spinner from '@/components/common/spinner';
import getLayerImageElement from '@/components/master-art-viewer/layer-image-element';
import {
  createGetLayerControlTokenValueFn,
  fetchIpfs,
  getLayersFromMetadata,
} from '@/components/master-art-viewer/utils';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS } from '@/config';
import {
  MasterArtNFTMetadata,
  LayerRelativeTokenIdAndLever,
} from '@/types/shared';
import { getErrorMessage } from '@/utils';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Address } from 'viem';
import { getContract } from 'wagmi/actions';

type MasterArtInfo = {
  tokenAddress: Address;
  tokenId: number;
  tokenURI: string;
};

export default function MasterArtViewer({
  onClose,
}: {
  onClose: VoidFunction;
}) {
  const [artInfo, setArtInfo] = useState<MasterArtInfo>();

  if (!artInfo)
    return (
      <Modal title="View Master Artwork" onClose={onClose}>
        <FormScreen onSubmit={setArtInfo} />
      </Modal>
    );

  return (
    <ModalSkeleton className="overflow-auto" onClose={onClose}>
      <button
        onClick={onClose}
        aria-label="Close"
        className="fixed top-0 right-0 z-10 text-3xl text-white leading-none m-8"
      >
        &#10005;
      </button>
      <MasterArtScreen artInfo={artInfo} />
    </ModalSkeleton>
  );
}

type FormScreenProps = {
  onSubmit: (artInfo: MasterArtInfo) => void;
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

    const contract = getContract({
      address: tokenAddress,
      abi: tokenAddress === V1_CONTRACT_ADDRESS ? v1Abi : v2Abi,
    });

    try {
      const tokenURI = await contract.read.tokenURI([BigInt(tokenId)]);
      // V1 contract won't fail for non existent token, it will just return an empty string.
      if (!tokenURI) throw new Error('URI query for nonexistent token');

      // controlTokens exist for layers , this means it's layer token
      const controlTokens = await contract.read
        .getControlToken([BigInt(tokenId)])
        .catch(() => null);

      if (controlTokens) throw new Error('URI query for nonexistent token');
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
          Master Token ID
        </label>
        <input
          type="number"
          min={0}
          step={1}
          required
          id="tokenId"
          name="tokenId"
          className="mt-1"
          placeholder="2567"
        />
      </div>
      <button
        disabled={state === 'loading'}
        className="w-full text-white hover:text-black text-sm font-bold bg-black hover:bg-transparent py-2.5 rounded-md border border-black transition disabled:opacity-50 disabled:pointer-events-none mt-4"
      >
        Render Artwork
      </button>
      {(state === 'token404' || state === 'error') && (
        <p className="text-red text-sm text-center mt-3">
          {state === 'token404'
            ? 'Invalid master token id provided.'
            : 'Unexpected error occured. Please try again.'}
        </p>
      )}
    </form>
  );
}

type MasterArtScreenProps = {
  artInfo: MasterArtInfo;
};

const ERROR_MSG = 'Unexpected issue occured.\nPlease try again.';

function MasterArtScreen({ artInfo }: MasterArtScreenProps) {
  const isComponentMountedRef = useRef(true);
  const imagesContainer = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState('Loading NFT metadata...');

  const renderArtwork = async () => {
    try {
      const response = await fetchIpfs(artInfo.tokenURI);
      const metadata = (await response.json()) as MasterArtNFTMetadata;
      const getLayerControlTokenValue = createGetLayerControlTokenValueFn(
        artInfo.tokenId,
        metadata['async-attributes']?.['unminted-token-values']
      );

      const readTransformationProperty = (
        property: LayerRelativeTokenIdAndLever | number
      ) =>
        typeof property === 'number'
          ? property
          : getLayerControlTokenValue(
              property['token-id'],
              property['lever-id']
            );

      if (!isComponentMountedRef.current) return;
      const layers = await getLayersFromMetadata(
        metadata,
        getLayerControlTokenValue
      );

      const layerImageElements: HTMLImageElement[] = [];

      for (const layer of layers) {
        if (!isComponentMountedRef.current) return;
        setStatusMessage(
          `Loading layers ${layerImageElements.length + 1}/${layers.length}...`
        );

        const isLayerVisible = await readTransformationProperty(
          layer.transformationProperties.visible === undefined
            ? 1
            : layer.transformationProperties.visible
        );
        if (!isLayerVisible) continue;

        const layerImageElement = await getLayerImageElement(
          layer,
          metadata.layout.version || 1,
          anchorLayerId =>
            layerImageElements.find(el => el.id === anchorLayerId)!,
          readTransformationProperty
        );
        layerImageElements.push(layerImageElement);
      }

      imagesContainer.current!.replaceChildren(...layerImageElements);
    } catch (error) {
      console.error(error);
      setStatusMessage(ERROR_MSG);
    }
  };

  useEffect(() => {
    renderArtwork();

    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  return (
    <div ref={imagesContainer} className="relative">
      <div className="w-full fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {statusMessage === ERROR_MSG ? (
          <>
            {/* x-circle from Feather Icons */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red mx-auto mb-8"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <p className="text-white text-center">
              {ERROR_MSG.split('\n')[0]}
              <br />
              {ERROR_MSG.split('\n')[1]}
            </p>
          </>
        ) : (
          <>
            <Spinner size={80} className="text-purple mx-auto mt-12 mb-8" />
            <p className="text-white text-center">
              {statusMessage}
              <br />
              The process can take several minutes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
