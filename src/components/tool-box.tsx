import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ArrowRightCircle } from 'react-feather';
import { useAccount } from 'wagmi';

type Props = {
  title: string;
  description: string;
  icon: any;
  onClick: VoidFunction;
};

export default function ToolBox({ title, description, icon, onClick }: Props) {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const handleClick = () => {
    if (!address) return openConnectModal?.();
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded-lg p-5 shadow-soft-drop md:hover:scale-[103%] transition"
    >
      <div className="flex items-center justify-between">
        <img src={icon.src} width={icon.width} height={icon.height} />
        <ArrowRightCircle size={24} className="opacity-50" />
      </div>
      <h3 className="text-lg mt-4 mb-2">{title}</h3>
      <p className="text-sm text-grey">{description}</p>
    </div>
  );
}
