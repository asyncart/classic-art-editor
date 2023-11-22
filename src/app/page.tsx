'use client';

import logo from '../../public/logo/async-logo.svg';
import viewMasterArtIcon from '../../public/icons/solid-badged.svg';
import updateLayerArtIcon from '../../public/icons/scrollreveal.svg';
import MasterArtViewer from '@/components/master-art-viewer/master-art-viewer';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ToolBox from '@/components/tool-box';
import { useState } from 'react';

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
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#C362FF] to-[#5D45F7] font-bold ml-3">
            Classic Art Editor
          </h1>
          <ConnectButton />
        </nav>
      </header>
      <main className="container px-4">
        <p>
          Some explainer text on what happened, why we need this editor and how
          to use it / tools it offers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
          <ToolBox
            icon={viewMasterArtIcon}
            title="View Master Artwork"
            description="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Fugiat eius vel consectetur! Non beatae autem sapiente illum blanditiis eligendi dignissimos?"
            onClick={() => setModal(MODAL.VIEW_MASTER_ARTWORK)}
          />
          <ToolBox
            icon={updateLayerArtIcon}
            title="Update Layer Artwork"
            description="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Fugiat eius vel consectetur! Non beatae autem sapiente illum blanditiis eligendi dignissimos?"
            onClick={() => setModal(MODAL.UPDATE_LAYER_ARTWORK)}
          />
        </div>
      </main>
      <footer className="container"></footer>
      {modal === MODAL.VIEW_MASTER_ARTWORK && (
        <MasterArtViewer onClose={() => setModal(MODAL.NONE)} />
      )}
    </div>
  );
}
