import { HTMLAttributes, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import cx from 'classnames';

interface ModalSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
}

export const ModalSkeleton = (props: ModalSkeletonProps) => {
  const dialogRef = useRef(null);

  // useLockBodyScroll();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };

  useEffect(() => {
    document.addEventListener('keyup', handleKeyDown);

    return () => {
      document.removeEventListener('keyup', handleKeyDown);
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      {...props}
      ref={dialogRef}
      tabIndex={0}
      className="dialog fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden px-4"
    >
      <div
        className="fixed inset-0 -z-10 bg-black/75 backdrop-blur-sm"
        onClick={props.onClose}
      />
      {props.children}
    </div>,
    document.body
  );
};

type ModalProps = {
  title?: ReactNode;
  children: ReactNode;
  onDismiss: () => void;
  className?: string;
  titleClassName?: string;
};

export const Modal = ({
  children,
  title = '',
  onDismiss,
  className = '',
  titleClassName = 'text-xl text-center leading-6 pt-5',
}: ModalProps) => {
  const classNames = cx(
    'rounded-xl w-full p-4 sm:p-8',
    className,
    !className.includes('max-w') && 'max-w-lg',
    !className.includes('bg-') && 'bg-white dark:bg-charade'
  );

  return (
    <ModalSkeleton onClose={onDismiss}>
      <article className={classNames}>
        {/* z-10 is required so header is above possible Confetti */}
        <header className="relative z-10 mb-5">
          <button
            onClick={onDismiss}
            aria-label="Close"
            className="absolute top-0 right-0 text-lg text-black focus-visible:shadow-outline leading-none"
          >
            &#10005;
          </button>
          {title && <p className={titleClassName}>{title}</p>}
        </header>
        {children}
      </article>
    </ModalSkeleton>
  );
};
