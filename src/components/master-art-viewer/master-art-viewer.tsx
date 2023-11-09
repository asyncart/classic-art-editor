import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { Modal } from '@/components/common/modal';
import Spinner from '@/components/common/spinner';
import { getActiveStateIndex } from '@/components/master-art-viewer/utils';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS } from '@/config';
import useContract from '@/hooks/useContract';
import { ArtNFTMetadata, LayerTransformationProperties } from '@/types/shared';
import { getErrorMessage } from '@/utils';
import { FormEvent, useEffect, useState } from 'react';
import seedrandom from 'seedrandom';
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

  return (
    <Modal title="View Master Artwork" onDismiss={onClose}>
      {!artInfo && <FormScreen onSubmit={setArtInfo} />}
      {artInfo && <MasterArtScreen artInfo={artInfo} />}
    </Modal>
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
        <select className="mt-1" name="tokenAddress" required>
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
            ? 'Token does not exist.'
            : 'Unexpected error occured. Please try again.'}
        </p>
      )}
    </form>
  );
}

type MasterArtScreenProps = {
  artInfo: MasterArtInfo;
};

function MasterArtScreen({ artInfo }: MasterArtScreenProps) {
  const contract = useContract(artInfo.tokenAddress);
  const [isLoading, setIsLoading] = useState(true);

  const getLayersToRender = async (metadata: ArtNFTMetadata) => {
    const layers: {
      id: string;
      activeStateURI: string;
      transformationProperties: LayerTransformationProperties;
    }[] = [];

    for (const layer of metadata.layout.layers) {
      // Check if it's static layer / only one state
      if ('uri' in layer) {
        const { id, label, uri, ...transformationProperties } = layer;
        layers.push({ id, activeStateURI: uri, transformationProperties });
        continue;
      }

      const activeStateIndex = await getActiveStateIndex(
        layer,
        artInfo.tokenId,
        // @ts-ignore
        contract
      );
      const state = layer.states.options[activeStateIndex];
      const { uri, label, ...transformationProperties } = state;
      layers.push({
        id: layer.id,
        activeStateURI: uri,
        transformationProperties,
      });
    }

    return layers;
  };

  const renderLayers = async (
    layers: Awaited<ReturnType<typeof getLayersToRender>>
  ) => {
  };

  useEffect(() => {
    let isMounted = true;
    fetch(`https://ipfs.io/ipfs/${artInfo.tokenURI}`)
      .then(response => response.json())
      .then((metadata: ArtNFTMetadata) => {
        if (!isMounted) return;
        getLayersToRender(metadata).then(layers => {
          if (!isMounted) return;
          renderLayers(layers);
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) return <Spinner size={80} className="mx-auto mt-12 mb-8" />;

  return (
    <>
      <div className="relative"></div>
      <button className="w-full text-white hover:text-black text-sm font-bold bg-black hover:bg-transparent py-2.5 rounded-md border border-black transition mt-4">
        Download Image
      </button>
    </>
  );
}
