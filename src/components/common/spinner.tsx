import cx from 'classnames';

type Props = {
  size?: number;
  className?: string;
};

export default function Spinner({ size = 24, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      strokeLinecap="round"
      fill="none"
      stroke="currentColor"
      className={cx(className, 'animate-spin')}
    >
      <circle
        cx="50"
        cy="50"
        r="32"
        strokeDasharray="50 50"
        strokeWidth="8"
      ></circle>
    </svg>
  );
}
