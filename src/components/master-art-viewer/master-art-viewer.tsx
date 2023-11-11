import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { Modal, ModalSkeleton } from '@/components/common/modal';
import Spinner from '@/components/common/spinner';
import {
  createGetLayerControlTokenValueFn,
  getActiveStateIndex,
} from '@/components/master-art-viewer/utils';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS } from '@/config';
import useContract from '@/hooks/useContract';
import {
  ArtNFTMetadata,
  LayerRelativeTokenIdAndLever,
  LayerTransformationProperties,
} from '@/types/shared';
import { getErrorMessage } from '@/utils';
import { CSSProperties, FormEvent, useEffect, useState } from 'react';
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

  if (!artInfo)
    return (
      <Modal title="View Master Artwork" onClose={onClose}>
        <FormScreen onSubmit={setArtInfo} />
      </Modal>
    );

  return (
    <ModalSkeleton onClose={onClose}>
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

// Good pieces for testing
// https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-786
// https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-343
// https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-23
function MasterArtScreen({ artInfo }: MasterArtScreenProps) {
  const [layersToRender, setLayerToRender] =
    useState<{ id: string; uri: string; style: CSSProperties }[]>();

  const getLayersToRender = async (
    metadata: ArtNFTMetadata,
    getLayerControlTokenValue: ReturnType<
      typeof createGetLayerControlTokenValueFn
    >
  ) => {
    const layers: {
      id: string;
      activeStateURI: string;
      transformationProperties: LayerTransformationProperties;
    }[] = [];

    for (const layer of metadata.layout.layers) {
      // Skip empty layer (was usually the first layer in a piece, required by Jimp on renderer server)
      if (!('uri' in layer) && !('states' in layer)) continue;

      // Check if it's static layer / only one state
      if ('uri' in layer) {
        const { id, label, uri, ...transformationProperties } = layer;
        layers.push({ id, activeStateURI: uri, transformationProperties });
        continue;
      }

      const activeStateIndex = await getActiveStateIndex(
        layer,
        getLayerControlTokenValue
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

  const getLayersWithStyle = async (
    layers: Awaited<ReturnType<typeof getLayersToRender>>,
    getLayerControlTokenValue: ReturnType<
      typeof createGetLayerControlTokenValueFn
    >
  ) => {
    const layersWithStyle: typeof layersToRender = [];
    const readTransformationProperty = (
      property: LayerRelativeTokenIdAndLever | number
    ) =>
      typeof property === 'number'
        ? property
        : getLayerControlTokenValue(property['token-id'], property['lever-id']);

    for (const layer of layers) {
      const filters = [];
      const transforms = [];
      const style: CSSProperties = {};

      const isLayerVisible = await readTransformationProperty(
        layer.transformationProperties.visible || 1
      );
      if (!isLayerVisible) continue;

      const { x = 100, y = 100 } = layer.transformationProperties.scale || {};
      let scaleX = await readTransformationProperty(x);
      let scaleY = await readTransformationProperty(y);

      if (layer.transformationProperties.mirror) {
        const { x, y } = layer.transformationProperties.mirror;
        const mirrorX = await readTransformationProperty(x);
        const mirrorY = await readTransformationProperty(y);
        if (mirrorX) scaleX = -scaleX;
        if (mirrorY) scaleY = -scaleY;
      }

      transforms.push(`scale(${scaleX / 100}, ${scaleY / 100})`);

      if (layer.transformationProperties['fixed-rotation']) {
        const fixedRotation = layer.transformationProperties['fixed-rotation'];
        if ('random' in fixedRotation) {
          const date = new Date();
          const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
          const maxValueExclusive =
            fixedRotation.random.max_value_inclusive + 1;
          const degrees =
            Math.floor(seedrandom(key)() * maxValueExclusive) *
            fixedRotation.multiplier;
          transforms.push(`rotate(${degrees}deg)`);
        } else {
          const degrees = await readTransformationProperty(fixedRotation);
          transforms.push(
            `rotate(${degrees * (fixedRotation.multiplier || 1)}deg)`
          );
        }
      }

      if (layer.transformationProperties.color?.alpha) {
        style.opacity =
          (await readTransformationProperty(
            layer.transformationProperties.color?.alpha
          )) / 100;
      }

      if (layer.transformationProperties.color?.hue) {
        const degrees = await readTransformationProperty(
          layer.transformationProperties.color?.hue
        );
        filters.push(`hue-rotate(${degrees}deg)`);
      }

      if (layer.transformationProperties.color?.brightness) {
        const brightness = await readTransformationProperty(
          layer.transformationProperties.color?.brightness
        );
        if (brightness !== 0) filters.push(`brightness(${brightness})`);
      }

      if (layer.transformationProperties.color?.saturation) {
        const saturation = await readTransformationProperty(
          layer.transformationProperties.color?.saturation
        );
        if (saturation !== 0) filters.push(`saturate(${saturation})`);
      }

      if (layer.transformationProperties.color?.opacity) {
        style.opacity =
          (await readTransformationProperty(
            layer.transformationProperties.color?.opacity
          )) / 100;
      }

      if (layer.transformationProperties.color?.multiply)
        style.mixBlendMode = 'multiply';
      if (layer.transformationProperties.color?.hardlight)
        style.mixBlendMode = 'hard-light';
      if (layer.transformationProperties.color?.lighten)
        style.mixBlendMode = 'lighten';
      if (layer.transformationProperties.color?.overlay)
        style.mixBlendMode = 'overlay';
      if (layer.transformationProperties.color?.difference)
        style.mixBlendMode = 'difference';
      if (layer.transformationProperties.color?.exclusion)
        style.mixBlendMode = 'exclusion';
      if (layer.transformationProperties.color?.screen)
        style.mixBlendMode = 'screen';

      style.filter = filters.join(' ');
      style.transform = transforms.join(' ');

      layersWithStyle.push({ id: layer.id, uri: layer.activeStateURI, style });
    }
    return layersWithStyle;
  };

  useEffect(() => {
    let isMounted = true;

    fetch(`https://ipfs.io/ipfs/${artInfo.tokenURI}`)
      .then(response => response.json())
      .then(async (metadata: ArtNFTMetadata) => {
        if (!isMounted) return;
        const getLayerControlTokenValue = createGetLayerControlTokenValueFn(
          artInfo.tokenId,
          metadata['async-attributes']?.['unminted-token-values']
        );

        const layers = await getLayersToRender(
          metadata,
          getLayerControlTokenValue
        );
        if (!isMounted) return;

        const layersWithStyle = await getLayersWithStyle(
          layers,
          getLayerControlTokenValue
        );
        if (!isMounted) return;

        setLayerToRender(layersWithStyle);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!layersToRender)
    return <Spinner size={80} className="text-purple mx-auto mt-12 mb-8" />;

  return (
    <>
      <div className="relative w-full h-full flex items-center justify-center">
        {layersToRender.map((layer, index) => (
          <img
            key={index}
            src={`https://ipfs.io/ipfs/${layer.uri}`}
            className="absolute"
            style={layer.style}
            alt={layer.id}
          />
        ))}
      </div>
    </>
  );
}
