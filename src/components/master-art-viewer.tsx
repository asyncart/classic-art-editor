import { Modal } from '@/components/common/modal';
import Spinner from '@/components/common/spinner';
import { V1_CONTRACT_ADDRESS, V2_CONTRACT_ADDRESS } from '@/config';
import useContract from '@/hooks/useContract';
import { FormEvent, useState } from 'react';
import { Address } from 'viem';

export default function MasterArtViewer({
  onClose,
}: {
  onClose: VoidFunction;
}) {
  const [artInfo, setArtInfo] = useState<{
    tokenAddress: Address;
    tokenId: number;
  }>();

  return (
    <Modal title="View Master Artwork" onDismiss={onClose}>
      {!artInfo && (
        <FormScreen
          onSubmit={(tokenAddress, tokenId) =>
            setArtInfo({ tokenAddress, tokenId })
          }
        />
      )}
      {artInfo && (
        <MasterArtScreen
          tokenAddress={artInfo.tokenAddress}
          tokenId={artInfo.tokenId}
        />
      )}
    </Modal>
  );
}

type FormScreenProps = {
  onSubmit: (tokenAddres: Address, tokenId: number) => void;
};

function FormScreen({ onSubmit }: FormScreenProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // @ts-ignore
    onSubmit(e.target.tokenAddress.value, Number(e.target.tokenId.value));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="tokenAddress" className="text-sm font-bold">
          Token Address
        </label>
        <select className="mt-1" name="tokenAddress" required>
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
      <button className="w-full text-white hover:text-black text-sm font-bold bg-black hover:bg-transparent py-2.5 rounded-md border border-black transition mt-4">
        Render Artwork
      </button>
    </form>
  );
}

type MasterArtScreenProps = {
  tokenAddress: Address;
  tokenId: number;
};

function MasterArtScreen({ tokenAddress, tokenId }: MasterArtScreenProps) {
  const contract = useContract(tokenAddress);
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) return <Spinner size={80} className="mx-auto mt-12 mb-8" />;

  return (
    <>
      <button className="w-full text-white hover:text-black text-sm font-bold bg-black hover:bg-transparent py-2.5 rounded-md border border-black transition mt-4">
        Download Image
      </button>
    </>
  );
}
