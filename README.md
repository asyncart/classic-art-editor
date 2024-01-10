# classic-art-editor

> Classic Async Art Editor.

## Development Setup

1. Install dependencies `npm i`
2. Start dev server `npm run dev`
3. Branch off of `main` and submit PR

## layer-controls.json

Some layers (e.g. layer with token id of 10) don't have `controls` property
stored in IPFS metadata file so we exported layers-controls map from our
database in layer-controls.json which serves as a fallback.
