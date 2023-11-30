import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { Modal, ModalSkeleton } from '@/components/common/modal';
import Spinner from '@/components/common/spinner';
import LayerImageBuilder, {
  LayerImageElement,
} from '@/components/master-art-viewer/layer-image-builder';
import {
  createGetLayerControlTokenValueFn,
  getLayersFromMetadata,
  getMasterArtSize,
} from '@/components/master-art-viewer/utils';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS } from '@/config';
import { MasterArtNFTMetadata } from '@/types/shared';
import { getErrorMessage, sleep } from '@/utils/common';
import {
  fetchIpfs,
  getCustomIPFSGateway,
  setCustomIPFSGateway,
} from '@/utils/ipfs';
import { toBlob } from 'html-to-image';
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
  masterArtSize: Awaited<ReturnType<typeof getMasterArtSize>>;
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
    <ModalSkeleton className="overflow-auto !px-0" onClose={onClose}>
      <div className="fixed top-0 right-0 z-20 w-full flex justify-between p-6 md:p-8">
        {infoPanelData && (
          <button
            aria-label="Artwork details"
            onClick={() => setIsInfoPanelOpen(true)}
          >
            <Info size={28} className="text-white" />
          </button>
        )}
        <button onClick={onClose} aria-label="Close" className="ml-auto -mr-1">
          <X size={36} className="text-white" />
        </button>
      </div>
      <MasterArtScreen
        artInfo={artInfo}
        setInfoPanelData={(panelData) => {
          setInfoPanelData(panelData);
          setIsInfoPanelOpen(true);
        }}
      />
      {isInfoPanelOpen && infoPanelData && (
        <InfoPanel
          title={infoPanelData.title}
          layers={infoPanelData.layers}
          tokenURI={artInfo.tokenURI}
          masterArtSize={infoPanelData.masterArtSize}
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

const artElementId = 'master-art';
const ERROR_MESSAGE = 'Unexpected issue occured.\nPlease try again.';

function MasterArtScreen({ artInfo, setInfoPanelData }: MasterArtScreenProps) {
  // If the user closes the modal during rendering process, we want to stop further operations.
  const isComponentMountedRef = useRef(true);
  const artElementRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState<
    string | React.JSX.Element
  >('Loading NFT metadata...');

  const renderArtwork = async () => {
    try {
      const response = await fetchIpfs(artInfo.tokenURI);
      const metadata = (await response.json()) as MasterArtNFTMetadata;
      const masterArtSize = await getMasterArtSize(metadata.image);

      const getLayerControlTokenValue = createGetLayerControlTokenValueFn(
        artInfo.tokenId,
        metadata['async-attributes']?.['unminted-token-values'],
      );

      if (!isComponentMountedRef.current) return;
      const layers = await getLayersFromMetadata(
        metadata,
        getLayerControlTokenValue,
      );

      const artElement = artElementRef.current!;
      const { width, height, resizeToFitScreenRatio } = masterArtSize;
      const marginTop =
        (window.innerHeight - height * resizeToFitScreenRatio) / 2;

      artElement.style.marginTop = marginTop > 0 ? `${marginTop}px` : `0px`;
      artElement.style.width = `${width * resizeToFitScreenRatio}px`;
      artElement.style.height = `${height * resizeToFitScreenRatio}px`;

      for (const layer of layers) {
        if (!isComponentMountedRef.current) return;

        const layerImageBuilder = new LayerImageBuilder(
          layer.id,
          layer.transformationProperties,
          getLayerControlTokenValue,
        );

        layerImageBuilder.setLayoutVersion(metadata.layout.version || 1);
        if (layer.anchor) {
          const anchorImageEl = Array.from(artElement.children).find(
            (el) => el.id === layer.anchor,
          ) as LayerImageElement;
          layerImageBuilder.setAnchorLayer(anchorImageEl);
        }

        await layerImageBuilder.loadImage(layer.activeStateURI, (domain) =>
          setStatusMessage(
            <>
              Loading layers {artElement.children.length + 1}/{layers.length}
              ...
              <br />
              Loading {layer.activeStateURI} from{' '}
              <a target="_blank" href={`https://${domain}`}>
                {domain}
              </a>
            </>,
          ),
        );

        const layerImageElement = await layerImageBuilder.build();
        layerImageElement.resize(resizeToFitScreenRatio);
        artElement.appendChild(layerImageElement);
      }

      artElement.classList.remove('-z-20');
      setStatusMessage('');
      setInfoPanelData({
        title: metadata.name,
        layers: layers.map((layer) => ({
          title: layer.id,
          uri: layer.activeStateURI,
        })),
        masterArtSize,
      });
    } catch (error) {
      console.error(error);
      setStatusMessage(ERROR_MESSAGE);
    }
  };

  useEffect(() => {
    renderArtwork();

    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  return (
    <>
      {statusMessage && (
        <div className="w-full fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4">
          {statusMessage === ERROR_MESSAGE ? (
            <>
              <XCircle size={80} className="text-red mx-auto mb-8" />
              <p className="text-white text-center">
                {ERROR_MESSAGE.split('\n')[0]}
                <br />
                {ERROR_MESSAGE.split('\n')[1]}
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
      )}
      <div
        id={artElementId}
        ref={artElementRef}
        className="relative mx-auto -z-20"
      />
    </>
  );
}

type InfoPanelProps = InfoPanelData & {
  tokenURI: string;
  onClose: VoidFunction;
};

function InfoPanel({
  title,
  layers,
  tokenURI,
  masterArtSize,
  onClose,
}: InfoPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [isImageDownloading, setIsImageDownloading] = useState(false);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState<string>();

  const handleClosePanel = async () => {
    panelRef.current?.classList.add('-translate-x-full');
    await sleep(300);
    onClose();
  };

  // We scale the image to original/full dimensions to download it
  // Then we return it to the "fit the screen" dimensions
  const handleDownloadArtwork = async () => {
    setIsImageDownloading(true);
    const { width, height, resizeToFitScreenRatio } = masterArtSize;
    const artElement = document.querySelector<HTMLDivElement>(
      `#${artElementId}`,
    )!;
    const layerImageElements = document.querySelectorAll<LayerImageElement>(
      `#${artElementId} img`,
    )!;

    try {
      // html-to-image library produces wrong result with margin
      // https://github.com/bubkoo/html-to-image/issues/189
      artElement.classList.remove('mx-auto');
      artElement.style.width = `${width}px`;
      artElement.style.height = `${height}px`;
      layerImageElements.forEach((el) => el.resize(1));

      const blob = await toBlob(artElement);
      if (!blob) throw new Error();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title}.png`;
      link.click();
    } catch (error) {
      console.error(error);
      setDownloadErrorMessage(ERROR_MESSAGE);
    } finally {
      artElement.classList.add('mx-auto');
      artElement.style.width = `${width * resizeToFitScreenRatio}px`;
      artElement.style.height = `${height * resizeToFitScreenRatio}px`;
      layerImageElements.forEach((el) => el.resize(resizeToFitScreenRatio));
      setIsImageDownloading(false);
    }
  };

  useEffect(() => {
    sleep(0).then(() => {
      panelRef.current?.classList.remove('-translate-x-full');
    });
  }, []);

  return (
    <article
      ref={panelRef}
      className="fixed top-0 left-0 z-50 bg-white w-full h-screen sm:max-w-sm transition -translate-x-full overflow-y-auto"
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
      <section className="px-4 mt-6 pb-6">
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
        <ol className="list-decimal list-inside">
          {layers.map((layer) => (
            <li key={layer.title}>
              <a
                href={`https://ipfs.io/ipfs/${layer.uri}`}
                target="_blank"
                className="underline"
              >
                {layer.title}
              </a>
            </li>
          ))}
        </ol>
        <button
          onClick={handleDownloadArtwork}
          className="btn btn-black w-full mt-4"
          disabled={isImageDownloading}
        >
          Download Artwork
        </button>
        {downloadErrorMessage && (
          <p className="text-red text-sm text-center mt-2">
            {downloadErrorMessage}
          </p>
        )}
      </section>
    </article>
  );
}
