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
import { getErrorMessage, sleep } from '@/utils';
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChevronsLeft, Info, X, XCircle } from 'react-feather';
import { Address } from 'viem';
import { getContract } from 'wagmi/actions';

type MasterArtInfo = {
  tokenAddress: Address;
  tokenId: number;
  tokenURI: string;
};

type InfoPanelData = {
  title: string;
  layers: { title: string; uri: string }[];
};

export default function MasterArtViewer({
  onClose,
}: {
  onClose: VoidFunction;
}) {
  const [artInfo, setArtInfo] = useState<MasterArtInfo>();
  const [infoPanelData, setInfoPanelData] = useState<InfoPanelData>();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  if (!artInfo)
    return (
      <Modal title="View Master Artwork" onClose={onClose}>
        <FormScreen onSubmit={setArtInfo} />
      </Modal>
    );

  return (
    <ModalSkeleton className="overflow-auto" onClose={onClose}>
      <div className="fixed top-0 right-0 z-20 w-full flex justify-between p-6 md:p-8">
        {infoPanelData && (
          <button
            aria-label="Artwork details"
            onClick={() => setIsInfoPanelOpen(true)}
          >
            <Info size={28} className="text-white mr-4" />
          </button>
        )}
        <button onClick={onClose} aria-label="Close" className="ml-auto -mr-1">
          <X size={36} className="text-white" />
        </button>
      </div>
      <MasterArtScreen artInfo={artInfo} setInfoPanelData={setInfoPanelData} />
      {isInfoPanelOpen && infoPanelData && (
        <InfoPanel
          title={infoPanelData.title}
          layers={infoPanelData.layers}
          tokenURI={artInfo.tokenURI}
          onClose={() => setIsInfoPanelOpen(false)}
        />
      )}
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
  setInfoPanelData: Dispatch<SetStateAction<InfoPanelData | undefined>>;
};

const ERROR_MSG = 'Unexpected issue occured.\nPlease try again.';

function MasterArtScreen({ artInfo, setInfoPanelData }: MasterArtScreenProps) {
  const isComponentMountedRef = useRef(true);
  const imagesContainer = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState<
    string | React.JSX.Element
  >('Loading NFT metadata...');

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

      const layersForInfoPanel: InfoPanelData['layers'] = [];
      const layerImageElements: HTMLImageElement[] = [];

      for (const layer of layers) {
        if (!isComponentMountedRef.current) return;

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
          readTransformationProperty,
          domain => {
            setStatusMessage(
              <>
                Loading layers {layerImageElements.length + 1}/{layers.length}
                ...
                <br />
                Loading {layer.activeStateURI} from{' '}
                <a target='_blank' href={`https://${domain}`}>{domain}</a>
              </>
            );
          }
        );
        layerImageElements.push(layerImageElement);
        layersForInfoPanel.push({ title: layer.id, uri: layer.activeStateURI });
      }

      imagesContainer.current!.replaceChildren(...layerImageElements);
      setInfoPanelData({
        title: metadata.name,
        layers: layersForInfoPanel,
      });
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
    <div ref={imagesContainer} className="relative mx-auto">
      <div className="w-full fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4">
        {statusMessage === ERROR_MSG ? (
          <>
            <XCircle size={80} className="text-red mx-auto mb-8" />
            <p className="text-white text-center">
              {ERROR_MSG.split('\n')[0]}
              <br />
              {ERROR_MSG.split('\n')[1]}
            </p>
          </>
        ) : (
          <>
            <Spinner size={80} className="text-purple mx-auto mt-12 mb-8" />
            <p className="text-white text-center break-all">
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

type InfoPanelProps = {
  title: string;
  layers: { title: string; uri: string }[];
  tokenURI: string;
  onClose: VoidFunction;
};

function InfoPanel({ title, layers, tokenURI, onClose }: InfoPanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  const handleClosePanel = async () => {
    panelRef.current?.classList.add('-translate-x-full');
    await sleep(300);
    onClose();
  };

  useEffect(() => {
    sleep(0).then(() => {
      panelRef.current?.classList.remove('-translate-x-full');
    });
  }, []);

  return (
    <article
      ref={panelRef}
      className="fixed top-0 left-0 z-50 bg-white w-full min-h-screen sm:max-w-sm transition -translate-x-full"
    >
      <header className="flex justify-between items-center p-4">
        <h2 className="text-2xl font-bold">Details</h2>
        <button
          aria-label="Close sidebar"
          onClick={handleClosePanel}
          className="hover:bg-gray-100 rounded p-0.5 transition"
        >
          <ChevronsLeft size={28} className="opacity-50" />
        </button>
      </header>
      <hr />
      <section className="px-4 mt-6">
        <h3 className="text-lg font-bold">Title</h3>
        <p>{title}</p>
        <h3 className="text-lg font-bold mt-4">Metadata</h3>
        <a
          href={`https://ipfs.io/ipfs/${tokenURI}`}
          target="_blank"
          className="underline"
        >
          View on IPFS
        </a>
        <h3 className="text-lg font-bold mt-4">Layers</h3>
        {layers.map(layer => (
          <a
            href={`https://ipfs.io/ipfs/${layer.uri}`}
            target="_blank"
            className="block underline"
          >
            {layer.title}
          </a>
        ))}
      </section>
    </article>
  );
}
