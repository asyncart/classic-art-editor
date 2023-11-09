import v1Abi from '@/abis/v1Abi';
import v2Abi from '@/abis/v2Abi';
import { ArtNFTMetadata } from '@/types/shared';
import seedrandom from 'seedrandom';
import { GetContractResult } from 'wagmi/actions';

type Layer = Extract<
  ArtNFTMetadata['layout']['layers'][number],
  { states: any }
>;

export async function getActiveStateIndex(
  layer: Layer,
  masterTokenId: number,
  contract: GetContractResult<typeof v1Abi | typeof v2Abi>
): Promise<number> {
  if ('token-id' in layer.states) {
    const relativeTokenId = layer.states['token-id'];
    const layerTokenId = relativeTokenId + masterTokenId;
    const leverId = layer.states['lever-id'];
    const controlTokens = await contract.read.getControlToken([
      BigInt(layerTokenId),
    ]);
    return Number(controlTokens[2 + leverId * 3]);
  }

  if ('currency_price' in layer.states) {
    const response = await fetch(
      'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD'
    );
    const { USD: ethInUSD } = (await response.json()) as {
      USD: number;
    };
    return (
      layer.states.currency_price.handler.rules.find(
        ruleSet => ethInUSD >= ruleSet[0] && ethInUSD <= ruleSet[1]
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
      const layerTokenId = tokenId + masterTokenId;
      const controlTokens = await contract.read.getControlToken([
        BigInt(layerTokenId),
      ]);
      measureValue += Number(controlTokens[2 + leverId * 3]);
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
          ruleSet => measureValue >= ruleSet[0] && measureValue <= ruleSet[1]
        )?.[2] || 0;
  }

  return 0;
}
