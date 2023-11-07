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
      className="cursor-pointer rounded-lg p-5 shadow-soft-drop hover:scale-[103%] transition"
    >
      <div className="flex items-center justify-between">
        <img src={icon.src} width={icon.width} height={icon.height} />
        {/* From https://feathericons.com */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50 mr-2"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 16 16 12 12 8"></polyline>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      </div>
      <h3 className="text-lg mt-4 mb-2">{title}</h3>
      <p className="text-sm text-grey">{description}</p>
    </div>
  );
}
