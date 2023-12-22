import classNames from 'classnames';
import { ReactNode, useEffect, useRef, useState } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

export default function FAQ({ title, children, className }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleToggleEvent = () => setIsOpen((isOpen) => !isOpen);
    ref.current?.addEventListener('toggle', handleToggleEvent);
    return () => {
      ref.current?.removeEventListener('toggle', handleToggleEvent);
    };
  }, []);

  return (
    <details
      open
      ref={ref}
      className={classNames(
        'select-none rounded transition',
        isOpen && 'shadow-soft-drop',
        className,
      )}
    >
      <summary className="flex items-center justify-between cursor-pointer bg-alabaster font-bold pl-3 py-2">
        <span>{title}</span>
        <Arrow
          className={classNames(
            'mr-4 transition',
            isOpen ? 'rotate-90' : 'rotate-180',
          )}
        />
      </summary>
      {children}
    </details>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      width="8"
      height="13.28"
      viewBox="0 0 9 15"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M0.998961 1.57921e-06C1.26126 1.55628e-06 1.50813 0.0925776 1.70871 0.293158L7.865 6.46487C8.25073 6.85061 8.25073 7.49864 7.865 7.88437L1.70871 14.0407C1.32298 14.4264 0.674947 14.4264 0.289215 14.0407C-0.0965176 13.6549 -0.0965177 13.0069 0.289214 12.6212L5.73575 7.17462L0.289214 1.71265C-0.0965187 1.32692 -0.0965188 0.67889 0.289213 0.293158C0.474365 0.108006 0.736663 1.60214e-06 0.998961 1.57921e-06Z"></path>
    </svg>
  );
}
