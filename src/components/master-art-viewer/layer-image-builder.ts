import { createGetLayerControlTokenValueFn } from '@/components/master-art-viewer/utils';
import {
  LayerRelativeTokenIdAndLever,
  LayerTransformationProperties,
} from '@/types/shared';
import { fetchIpfs } from '@/utils/ipfs';
import seedrandom from 'seedrandom';

/**
 * LayerImageElement is constructed with Builder design pattern.
 * We can't have our class directly extend HTMLImageElement since it would require us to switch to Web Components. (see TypeError: Illegal constructor)
 * It's also cleaner to separate object construction from representation in this case. (hence builder pattern)
 */

export interface LayerImageElement extends HTMLImageElement {
  naturalTop: number;
  naturalLeft: number;
  resize: (ratio: number) => void;
}

export default class LayerImageBuilder {
  private image: HTMLImageElement;

  private layoutVersion = 1;
  private anchorLayer: null | LayerImageElement = null;

  private transformationProperties: LayerTransformationProperties;
  private getLayerControlTokenValue: ReturnType<
    typeof createGetLayerControlTokenValueFn
  >;

  constructor(
    id: string,
    transformationProperties: LayerTransformationProperties,
    getLayerControlTokenValue: ReturnType<
      typeof createGetLayerControlTokenValueFn
    >,
  ) {
    this.image = new Image();
    this.image.id = id;
    this.image.alt = id;
    this.image.className = 'absolute';
    this.transformationProperties = transformationProperties;
    this.getLayerControlTokenValue = getLayerControlTokenValue;
  }

  setAnchorLayer(anchorLayer: LayerImageElement) {
    this.anchorLayer = anchorLayer;
  }

  setLayoutVersion(layoutVersion: number) {
    this.layoutVersion = layoutVersion;
  }

  async loadImage(uri: string, reportGateway: Parameters<typeof fetchIpfs>[1]) {
    const imageResponse = await fetchIpfs(uri, reportGateway);
    const imageBlob = await imageResponse.blob();

    this.image.src = URL.createObjectURL(imageBlob);

    // Ensures that naturalWidth, naturalHeight, width and height properties are populated
    await new Promise((resolve) => {
      if (this.image.complete) return resolve(undefined);
      this.image.onload = () => resolve(undefined);
    });
  }

  async build(): Promise<LayerImageElement> {
    await this.addOpacity();
    await this.addBlendMode();
    await this.addFilters();
    await this.addTransforms();
    await this.addPosition();

    const naturalTop = Number(this.image.style.top.split('px')[0] || 0);
    const naturalLeft = Number(this.image.style.left.split('px')[0] || 0);

    return Object.assign(this.image, {
      naturalTop,
      naturalLeft,
      resize: (ratio: number) => {
        this.image.style.maxWidth = `${this.image.naturalWidth * ratio}px`;
        this.image.style.maxHeight = `${this.image.naturalHeight * ratio}px`;
        this.image.style.top = `${naturalTop * ratio}px`;
        this.image.style.left = `${naturalLeft * ratio}px`;
      },
    });
  }

  private async readTransformationProperty(
    property: LayerRelativeTokenIdAndLever | number,
  ) {
    return typeof property === 'number'
      ? property
      : this.getLayerControlTokenValue(
          property['token-id'],
          property['lever-id'],
        );
  }

  private async addOpacity() {
    const opacity =
      this.transformationProperties.color?.alpha ||
      this.transformationProperties.color?.opacity;

    if (opacity) {
      this.image.style.opacity = String(
        (await this.readTransformationProperty(opacity)) / 100,
      );
    }
  }

  private async addBlendMode() {
    if (this.transformationProperties.color?.multiply)
      this.image.style.mixBlendMode = 'multiply';
    if (this.transformationProperties.color?.hardlight)
      this.image.style.mixBlendMode = 'hard-light';
    if (this.transformationProperties.color?.lighten)
      this.image.style.mixBlendMode = 'lighten';
    if (this.transformationProperties.color?.overlay)
      this.image.style.mixBlendMode = 'overlay';
    if (this.transformationProperties.color?.difference)
      this.image.style.mixBlendMode = 'difference';
    if (this.transformationProperties.color?.exclusion)
      this.image.style.mixBlendMode = 'exclusion';
    if (this.transformationProperties.color?.screen)
      this.image.style.mixBlendMode = 'screen';
  }

  private async addFilters() {
    const filters: string[] = [];

    if (this.transformationProperties.color?.hue) {
      const degrees = await this.readTransformationProperty(
        this.transformationProperties.color?.hue,
      );
      filters.push(`hue-rotate(${degrees}deg)`);
    }

    if (this.transformationProperties.color?.brightness) {
      const brightness = await this.readTransformationProperty(
        this.transformationProperties.color?.brightness,
      );
      if (brightness !== 0) filters.push(`brightness(${brightness / 100}%)`);
    }

    if (this.transformationProperties.color?.saturation) {
      const saturation = await this.readTransformationProperty(
        this.transformationProperties.color?.saturation,
      );
      if (saturation !== 0) filters.push(`saturate(${saturation}%)`);
    }

    this.image.style.filter = filters.join(' ');
  }

  private async addTransforms() {
    const transforms: string[] = [];

    const { x = 100, y = 100 } = this.transformationProperties.scale || {};
    let scaleX = await this.readTransformationProperty(x);
    let scaleY = await this.readTransformationProperty(y);

    if (this.transformationProperties.mirror) {
      const { x, y } = this.transformationProperties.mirror;
      const mirrorX = await this.readTransformationProperty(x);
      const mirrorY = await this.readTransformationProperty(y);
      if (mirrorX) scaleX = -scaleX;
      if (mirrorY) scaleY = -scaleY;
    }

    transforms.push(`scale(${scaleX / 100}, ${scaleY / 100})`);

    if (this.transformationProperties['fixed-rotation']) {
      const fixedRotation = this.transformationProperties['fixed-rotation'];
      if ('random' in fixedRotation) {
        const date = new Date();
        const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
        const maxValueExclusive = fixedRotation.random.max_value_inclusive + 1;
        const degrees =
          Math.floor(seedrandom(key)() * maxValueExclusive) *
          fixedRotation.multiplier;
        transforms.push(`rotate(-${degrees}deg)`);
      } else {
        const degrees = await this.readTransformationProperty(fixedRotation);
        transforms.push(
          `rotate(-${degrees * (fixedRotation.multiplier || 1)}deg)`,
        );
      }
    }

    this.image.style.transform = transforms.join(' ');
  }

  private async addPosition() {
    // anchor doesn't exist for fixed position layers
    const isPositionFixed =
      this.transformationProperties['fixed-position'] ||
      (!this.anchorLayer && this.transformationProperties['relative-position']);

    if (isPositionFixed) {
      const { x, y } =
        this.transformationProperties['fixed-position'] ||
        this.transformationProperties['relative-position']!;
      const fixedX = await this.readTransformationProperty(x);
      const fixedY = await this.readTransformationProperty(y);
      this.image.style.top = `${Math.floor(
        fixedY - this.image.naturalHeight / 2,
      )}px`;
      this.image.style.left = `${Math.floor(
        fixedX - this.image.naturalWidth / 2,
      )}px`;
      return;
    }

    if (!this.anchorLayer) return;

    let baseX =
      this.anchorLayer.naturalLeft + this.anchorLayer.naturalWidth / 2;

    let baseY =
      this.anchorLayer.naturalTop + this.anchorLayer.naturalHeight / 2;

    if (this.transformationProperties['relative-position']) {
      const { x, y } = this.transformationProperties['relative-position'];
      let relativeX = await this.readTransformationProperty(x);
      let relativeY = await this.readTransformationProperty(y);

      if (this.transformationProperties['orbit-rotation']) {
        const relativeRotation = await this.readTransformationProperty(
          this.transformationProperties['orbit-rotation'],
        );
        const unrotatedRelativeX = relativeX;
        const rad = (-relativeRotation * Math.PI) / 180;

        relativeX = Math.round(
          relativeX * Math.cos(rad) - relativeY * Math.sin(rad),
        );

        relativeY =
          this.layoutVersion === 1
            ? Math.round(relativeY * Math.cos(rad) + relativeX * Math.sin(rad))
            : Math.round(
                relativeY * Math.cos(rad) + unrotatedRelativeX * Math.sin(rad),
              );
      }

      baseX += relativeX;
      baseY += relativeY;
    }

    this.image.style.top = `${Math.floor(
      baseY - this.image.naturalHeight / 2,
    )}px`;
    this.image.style.left = `${Math.floor(
      baseX - this.image.naturalWidth / 2,
    )}px`;
  }
}
