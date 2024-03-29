export type LayerRelativeTokenIdAndLever = {
  'token-id': number;
  'lever-id': number;
};

export type LayerTransformationProperties = {
  'fixed-position'?: {
    x: LayerRelativeTokenIdAndLever | number;
    y: LayerRelativeTokenIdAndLever | number;
  };
  'relative-position'?: {
    x: LayerRelativeTokenIdAndLever | number;
    y: LayerRelativeTokenIdAndLever | number;
  };
  scale?: {
    x: LayerRelativeTokenIdAndLever | number;
    y: LayerRelativeTokenIdAndLever | number;
  };
  mirror?: {
    x: LayerRelativeTokenIdAndLever | number;
    y: LayerRelativeTokenIdAndLever | number;
  };
  'orbit-rotation'?: LayerRelativeTokenIdAndLever;
  'fixed-rotation'?:
    | (LayerRelativeTokenIdAndLever & {
        multiplier?: number;
      })
    | {
        multiplier: number;
        random: {
          max_value_inclusive: number;
          handler: {
            type: 'MODULO';
            max_bound_inclusive: number;
          };
        };
      };
  color?: {
    red?: LayerRelativeTokenIdAndLever;
    green?: LayerRelativeTokenIdAndLever;
    blue?: LayerRelativeTokenIdAndLever;
    alpha?: LayerRelativeTokenIdAndLever | number;
    hue?: LayerRelativeTokenIdAndLever;
    brightness?: LayerRelativeTokenIdAndLever;
    saturation?: LayerRelativeTokenIdAndLever;
    // Only "Tribe" uses opacity https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-162
    // opacity and alpha properties are the same
    opacity?: LayerRelativeTokenIdAndLever | number;
    multiply?: number;
    hardlight?: number;
    lighten?: number;
    overlay?: number;
    difference?: number;
    exclusion?: number;
    screen?: number;
  };
  visible?: LayerRelativeTokenIdAndLever | number;
};

type ActiveStateRule =
  | {
      'token-id': number;
      'lever-id': number;
    }
  // This functionality is currently being used by 1 piece in production.
  // https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-1076
  | {
      currency_price: {
        type: 'eth_current';
        handler: {
          type: 'CUSTOM';
          rules: [number, number, number][];
        };
      };
    }
  // This functionality is currently being used by 2 pieces in production.
  // Same piece, just minted twice, perhaps corrected? 1524 is publicly displayed.
  // https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-1497
  // https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-1524
  | {
      random: {
        max_value_inclusive: number;
        handler: {
          type: 'MODULO';
          max_bound_inclusive: number;
        };
      };
    }
  // This functionality is currently being used by 1 piece in production.
  // https://async.market/art/master/0xb6dae651468e9593e4581705a09c10a76ac1e0c8-1148
  | {
      combo_layer: {
        tokens: {
          tokenId: number;
          leverId: number;
        }[];
        handler: {
          type: 'MODULO';
          max_bound_inclusive: number;
        };
      };
    }
  | {
      time: {
        type:
          | 'SECONDS'
          | 'MONTH'
          | 'HOUR_OF_DAY'
          | 'DAY_OF_MONTH'
          | 'DAY_OF_YEAR';
        handler:
          | {
              type: 'MODULO';
              max_bound_inclusive: number;
            }
          | {
              type: 'CUSTOM';
              rules: [number, number, number][];
            };
      };
    };

export type LayerArtNFTMetadata = {
  name: string;
  description: string;
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
  image: string;
  'async-attributes'?: {
    artists: string[];
  };
  controls?: (
    | {
        minValue: number;
        maxValue: number;
        startValue: number;
        label: string;
        controlType:
          | 'ALPHA'
          | 'BLUE'
          | 'BRIGHTNESS'
          | 'GREEN'
          | 'GREYSCALE'
          | 'HUE'
          | 'POSITION'
          | 'RED'
          | 'REFLECT'
          | 'ROTATION'
          | 'SATURATION'
          | 'SCALE'
          | 'VISIBILITY';
      }
    | {
        minValue: number;
        maxValue: number;
        startValue: number;
        label: string;
        controlType: 'STATE';
        stateLabels: string[];
      }
  )[];
  master: string;
};

export type MasterArtNFTMetadata = {
  name: string;
  description: string;
  artistName: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  image: string;
  layout: {
    version?: 1 | 2 | 3 | 4 | 5;
    layers: (
      | {
          id: string;
          width: number;
          height: number;
        }
      | ({
          id: string;
          uri: string;
          label: string;
          anchor?: string;
        } & LayerTransformationProperties)
      | {
          id: string;
          states: {
            options: ({
              uri: string;
              label: string;
              anchor?: string;
            } & LayerTransformationProperties)[];
          } & ActiveStateRule;
        }
      | {
          id: string;
          states: {
            options: {
              id: string;
              states: {
                options: {
                  uri: string;
                  label: string;
                  anchor?: string;
                }[];
              } & ActiveStateRule;
            }[];
          } & ActiveStateRule;
        }
    )[];
  };
  'audio-layout'?: {
    mastering: {
      filters: string[];
      bitrate: string;
    };
    layers: {
      id: string;
      states: {
        options: { uri: string }[];
        'token-id': number;
        'lever-id': number;
      };
    }[];
  };
  'async-attributes'?: {
    artists: string[];
    forced_render_hours?: number[];
    timezone?: {
      name: string;
      default_utc_offset: number;
    };
    autonomous_description?: string;
    'unminted-token-values'?: {
      [relativeLayerTokenId: string]: [number, number, number];
    };
  };
};
