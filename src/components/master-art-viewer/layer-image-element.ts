import {
  fetchIpfs,
  getLayersFromMetadata,
} from '@/components/master-art-viewer/utils';
import {
  MasterArtNFTMetadata,
  LayerRelativeTokenIdAndLever,
} from '@/types/shared';
import seedrandom from 'seedrandom';

export default async function getLayerImageElement(
  layer: Awaited<ReturnType<typeof getLayersFromMetadata>>[number],
  layoutVersion: MasterArtNFTMetadata['layout']['version'],
  getAnchorLayer: (layerId: string) => HTMLImageElement,
  readTransformationProperty: (
    property: LayerRelativeTokenIdAndLever | number
  ) => number | Promise<number>
) {
  const filters = [];
  const transforms = [];

  const imageResponse = await fetchIpfs(layer.activeStateURI);
  const imageBlob = await imageResponse.blob();

  const image = new Image();
  image.id = layer.id;
  image.alt = layer.id;
  image.className = 'absolute';
  image.src = URL.createObjectURL(imageBlob);

  // Ensures that width and height properties are populated
  await new Promise(resolve => {
    if (image.complete) return resolve(undefined);
    image.onload = () => resolve(undefined);
  });

  image.style.minWidth = `${image.width}px`;
  image.style.minHeight = `${image.height}px`;

  // anchor doesn't exist for fixed position layers
  if (
    layer.transformationProperties['fixed-position'] ||
    (!layer.anchor && layer.transformationProperties['relative-position'])
  ) {
    const { x, y } =
      layer.transformationProperties['fixed-position'] ||
      layer.transformationProperties['relative-position']!;
    const fixedX = await readTransformationProperty(x);
    const fixedY = await readTransformationProperty(y);
    image.style.top = `${Math.floor(fixedY - image.height / 2)}px`;
    image.style.left = `${Math.floor(fixedX - image.width / 2)}px`;
  }

  if (layer.anchor) {
    const anchorLayer = getAnchorLayer(layer.anchor);
    const topMargin = Number(anchorLayer.style.top.split('px')[0]) || 0;
    const leftMargin = Number(anchorLayer.style.left.split('px')[0]) || 0;

    let baseX = leftMargin + anchorLayer.width / 2;
    let baseY = topMargin + anchorLayer.height / 2;

    if (layer.transformationProperties['relative-position']) {
      const { x, y } = layer.transformationProperties['relative-position'];
      let relativeX = await readTransformationProperty(x);
      let relativeY = await readTransformationProperty(y);

      if (layer.transformationProperties['orbit-rotation']) {
        const relativeRotation = await readTransformationProperty(
          layer.transformationProperties['orbit-rotation']
        );
        const unrotatedRelativeX = relativeX;
        const rad = (-relativeRotation * Math.PI) / 180;

        relativeX = Math.round(
          relativeX * Math.cos(rad) - relativeY * Math.sin(rad)
        );

        relativeY =
          layoutVersion === 1
            ? Math.round(relativeY * Math.cos(rad) + relativeX * Math.sin(rad))
            : Math.round(
                relativeY * Math.cos(rad) + unrotatedRelativeX * Math.sin(rad)
              );
      }
      baseX += relativeX;
      baseY += relativeY;
    }

    image.style.top = `${Math.floor(baseY - image.height / 2)}px`;
    image.style.left = `${Math.floor(baseX - image.width / 2)}px`;
  }

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
      const maxValueExclusive = fixedRotation.random.max_value_inclusive + 1;
      const degrees =
        Math.floor(seedrandom(key)() * maxValueExclusive) *
        fixedRotation.multiplier;
      transforms.push(`rotate(-${degrees}deg)`);
    } else {
      const degrees = await readTransformationProperty(fixedRotation);
      transforms.push(
        `rotate(-${degrees * (fixedRotation.multiplier || 1)}deg)`
      );
    }
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
    if (brightness !== 0) filters.push(`brightness(${brightness / 100}%)`);
  }

  if (layer.transformationProperties.color?.saturation) {
    const saturation = await readTransformationProperty(
      layer.transformationProperties.color?.saturation
    );
    if (saturation !== 0) filters.push(`saturate(${saturation}%)`);
  }

  const opacity =
    layer.transformationProperties.color?.alpha ||
    layer.transformationProperties.color?.opacity;

  if (opacity) {
    image.style.opacity = String(
      (await readTransformationProperty(opacity)) / 100
    );
  }

  if (layer.transformationProperties.color?.multiply)
    image.style.mixBlendMode = 'multiply';
  if (layer.transformationProperties.color?.hardlight)
    image.style.mixBlendMode = 'hard-light';
  if (layer.transformationProperties.color?.lighten)
    image.style.mixBlendMode = 'lighten';
  if (layer.transformationProperties.color?.overlay)
    image.style.mixBlendMode = 'overlay';
  if (layer.transformationProperties.color?.difference)
    image.style.mixBlendMode = 'difference';
  if (layer.transformationProperties.color?.exclusion)
    image.style.mixBlendMode = 'exclusion';
  if (layer.transformationProperties.color?.screen)
    image.style.mixBlendMode = 'screen';

  image.style.filter = filters.join(' ');
  image.style.transform = transforms.join(' ');

  return image;
}
