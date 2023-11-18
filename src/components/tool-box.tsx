import { ArrowRightCircle } from 'react-feather';

type Props = {
  title: string;
  description: string;
  icon: any;
  onClick: VoidFunction;
};

export default function ToolBox({ title, description, icon, onClick }: Props) {
  return (
    <div
      onClick={onClick}
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
