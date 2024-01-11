'use client';

import logo from '../../public/logo/async-logo.svg';
import viewMasterArtIcon from '../../public/icons/solid-badged.svg';
import updateLayerArtIcon from '../../public/icons/scrollreveal.svg';
import MasterArtViewer from '@/components/master-art-viewer/master-art-viewer';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ToolBox from '@/components/tool-box';
import { useState } from 'react';
import LayerArtChanger from '@/components/layer-art-updater/layer-art-changer';
import FAQ from '@/components/faq';

enum MODAL {
  NONE,
  VIEW_MASTER_ARTWORK,
  UPDATE_LAYER_ARTWORK,
}

export default function Home() {
  const [modal, setModal] = useState(MODAL.NONE);

  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="container pt-8 mb-12 px-4">
        <nav className="flex items-center justify-between">
          <img
            src={logo.src}
            width={logo.width}
            height={logo.height}
            className="w-24"
          />
          <h1 className="hidden sm:block text-2xl font-bold ml-3">
            Classic Art Editor
          </h1>
          <ConnectButton accountStatus="address" showBalance={false} />
        </nav>
      </header>
      <main className="container px-4">
        <section>
          <p>
            <span>
              What a ride it’s been. Thank you to everyone who used Async over
              the years. We were surprised over and over by the unique
              creativity this platform attracted from artists, musicians and
              collectors. We started Async with the mission to create something
              wholly new for artists, a concept that fundamentally couldn’t
              exist without the blockchain. And in doing so, hoped it would
              spark new ideas, build communities, and inspire people to do more
              with NFTs than just own them. Looking back, we can confidently say
              we’ve achieved all those goals and will miss the community and
              artists that helped get us there. And although we’re saying
              goodbye, your art lives on as a testament to that.
            </span>
            <br />
            <br />
            <span>
              We created this portal to allow anyone to continue to interact
              with Master/Layer based classic artworks. You can look up both
              Master and Layers by finding their token ID.
            </span>
            <br />
            <br />
            <span>Thank you again from all of us at Async ❤️</span>
            <br />
            <br />
            <span>Repository: </span>
            <a
              target="_blank"
              rel="noreferrer noopener"
              href="https://github.com/asyncart/classic-art-editor"
              className="underline"
            >
              https://github.com/asyncart/classic-art-editor
            </a>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
            <ToolBox
              icon={viewMasterArtIcon}
              title="View Master Artwork"
              description="View the current state for any Async Art Master token."
              onClick={() => setModal(MODAL.VIEW_MASTER_ARTWORK)}
            />
            <ToolBox
              icon={updateLayerArtIcon}
              title="Update Layer"
              description="Update the values for a Layer token that you own."
              onClick={() => setModal(MODAL.UPDATE_LAYER_ARTWORK)}
            />
          </div>
        </section>
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-2.5">FAQs</h2>
          <FAQ title="How do I find the Token ID for an artwork?">
            <p className="break-words pl-3 p-2">
              Find OpenSea page for the NFT you want to pull up. The last number
              in the URL is Token ID:
              <br />
              https://opensea.io/assets/ethereum/0xb6dae651468e9593e4581705a09c10a76ac1e0c8/
              <b className="text-purple">175</b>
            </p>
          </FAQ>
          <FAQ title="Where can I browse Master Artworks?" className="mt-4">
            <p className="pl-3 p-2">
              View all Masters on OpenSea{' '}
              <a
                href="https://opensea.io/collection/async-art?search[stringTraits][0][name]=Asset%20Type&search[stringTraits][0][values][0]=Master%20%28Art%29&search[stringTraits][0][values][1]=Master%20%28Music%29"
                target="_blank"
                rel="noreferrer noopener"
                className="text-purple underline"
              >
                here
              </a>
              .
            </p>
          </FAQ>
          <FAQ title="Where can I browse Layer Artworks?" className="mt-4">
            <p className="pl-3 p-2">
              View all Layers on OpenSea{' '}
              <a
                href="https://opensea.io/collection/async-art?search[stringTraits][0][name]=Asset%20Type&search[stringTraits][0][values][0]=Stem%20%28Music%29&search[stringTraits][0][values][1]=Layer%20%28Art%29"
                target="_blank"
                rel="noreferrer noopener"
                className="text-purple underline"
              >
                here
              </a>
              .
            </p>
          </FAQ>
        </section>
      </main>
      {modal === MODAL.VIEW_MASTER_ARTWORK && (
        <MasterArtViewer onClose={() => setModal(MODAL.NONE)} />
      )}
      {modal === MODAL.UPDATE_LAYER_ARTWORK && (
        <LayerArtChanger onClose={() => setModal(MODAL.NONE)} />
      )}
    </div>
  );
}
