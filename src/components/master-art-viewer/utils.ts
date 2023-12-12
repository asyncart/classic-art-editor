import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS, __PROD__ } from '@/config';
import {
  MasterArtNFTMetadata,
  LayerTransformationProperties,
} from '@/types/shared';
import { fetchIpfs } from '@/utils/ipfs';
import seedrandom from 'seedrandom';
import { getContract } from 'wagmi/actions';

export async function getMasterArtSize(uri: string) {
  const imageResponse = await fetchIpfs(uri);
  const imageBlob = await imageResponse.blob();

  const image = new Image();
  image.src = URL.createObjectURL(imageBlob);

  // Ensures that width and height properties are populated
  await new Promise((resolve) => {
    if (image.complete) return resolve(undefined);
    image.onload = () => resolve(undefined);
  });

  const resizeToFitScreenRatio = Math.min(
    window.innerWidth / image.width,
    window.innerHeight / image.height,
  );

  return {
    width: image.width,
    height: image.height,
    resizeToFitScreenRatio,
  };
}

export async function getLayersFromMetadata(
  metadataLayers:
    | MasterArtNFTMetadata['layout']['layers']
    | NonNullable<MasterArtNFTMetadata['audio-layout']>['layers'],
  getLayerControlTokenValue: ReturnType<
    typeof createGetLayerControlTokenValueFn
  >,
) {
  const layers: {
    id: string;
    anchor?: string;
    activeStateURI: string;
    transformationProperties: LayerTransformationProperties;
  }[] = [];

  for (const layer of metadataLayers) {
    // Skip empty layer (usually the first layer in a piece, required by Jimp on renderer server)
    if (!('uri' in layer) && !('states' in layer)) continue;

    let state = layer;

    while ('states' in state) {
      const activeStateIndex = await getActiveStateIndex(
        state,
        getLayerControlTokenValue,
      );

      // @ts-ignore
      state = state.states.options[activeStateIndex];
    }

    // @ts-ignore
    const { id, label, uri, anchor, ...transformationProperties } = state;
    if (transformationProperties.visible === 0) continue;
    if (typeof transformationProperties.visible === 'object') {
      const isLayerVisible = await getLayerControlTokenValue(
        transformationProperties.visible['token-id'],
        transformationProperties.visible['lever-id'],
      );
      if (!isLayerVisible) continue;
    }

    layers.push({
      id: layer.id,
      anchor,
      activeStateURI: uri,
      transformationProperties,
    });
  }

  return layers;
}

async function getActiveStateIndex(
  layer:
    | Extract<MasterArtNFTMetadata['layout']['layers'][number], { states: any }>
    | NonNullable<MasterArtNFTMetadata['audio-layout']>['layers'][number],
  getLayerControlTokenValue: ReturnType<
    typeof createGetLayerControlTokenValueFn
  >,
): Promise<number> {
  if ('token-id' in layer.states) {
    return getLayerControlTokenValue(
      layer.states['token-id'],
      layer.states['lever-id'],
    );
  }

  if ('currency_price' in layer.states) {
    const response = await fetch(
      'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD',
    );
    const { USD: ethInUSD } = (await response.json()) as {
      USD: number;
    };
    return (
      layer.states.currency_price.handler.rules.find(
        (ruleSet) => ethInUSD >= ruleSet[0] && ethInUSD <= ruleSet[1],
      )?.[2] || 0
    );
  }

  if ('random' in layer.states) {
    const date = new Date();
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    const maxValueExclusive = layer.states.random.max_value_inclusive + 1;
    return Math.floor(seedrandom(key)() * maxValueExclusive);
  }

  if ('combo_layer' in layer.states) {
    let measureValue = 0;

    for (const { tokenId, leverId } of layer.states.combo_layer.tokens) {
      measureValue += await getLayerControlTokenValue(tokenId, leverId);
    }

    return (
      measureValue % (layer.states.combo_layer.handler.max_bound_inclusive + 1)
    );
  }

  if ('time' in layer.states) {
    const date = new Date();
    const measureValue =
      {
        SECONDS: date.getTime() / 1000,
        MONTH: date.getUTCMonth(),
        HOUR_OF_DAY: date.getUTCHours(),
        DAY_OF_MONTH: date.getUTCDate() - 1,
        DAY_OF_YEAR:
          (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
            Date.UTC(date.getUTCFullYear(), 0, 0)) /
          86_400_000,
      }[layer.states.time.type] || 0;

    const { handler } = layer.states.time;
    return handler.type === 'MODULO'
      ? measureValue % (handler.max_bound_inclusive + 1)
      : handler.rules.find(
          (ruleSet) => measureValue >= ruleSet[0] && measureValue <= ruleSet[1],
        )?.[2] || 0;
  }

  return 0;
}

export function createGetLayerControlTokenValueFn(
  masterTokenId: number,
  unmintedTokenValuesMap: NonNullable<
    MasterArtNFTMetadata['async-attributes']
  >['unminted-token-values'],
) {
  const cache: { [layerTokenId: string]: readonly bigint[] } = {};
  return async (relativeLayerTokenId: number, leverId: number) => {
    const layerTokenId = masterTokenId + relativeLayerTokenId;
    if (cache[layerTokenId])
      return Number(cache[layerTokenId][2 + leverId * 3]);

    const v2contract = getContract({
      address: V2_CONTRACT_ADDRESS,
      abi: v2Abi,
    });

    const v2LayerControlTokens = await v2contract.read
      .getControlToken([BigInt(layerTokenId)])
      .catch(() => null);

    if (v2LayerControlTokens) {
      cache[layerTokenId] = v2LayerControlTokens;
      return Number(v2LayerControlTokens[2 + leverId * 3]);
    }

    // There are only 348 tokens [0 - 347] on the v1 contract and it only exists in production
    // Also V2 master pieces can have layers on v1 contract (e.g. master tokenId 23)
    if (V1_CONTRACT_ADDRESS && layerTokenId <= 347) {
      const v1contract = getContract({
        address: V1_CONTRACT_ADDRESS,
        abi: v1Abi,
      });

      const v1LayerControlTokens = await v1contract.read
        .getControlToken([BigInt(layerTokenId)])
        .catch(() => null);

      if (v1LayerControlTokens) {
        cache[layerTokenId] = v1LayerControlTokens;
        return Number(v1LayerControlTokens[2 + leverId * 3]);
      }
    }

    // If the layer wasn't minted, take the default/static value.
    return unmintedTokenValuesMap?.[relativeLayerTokenId][2 + leverId * 3] || 0;
  };
}
