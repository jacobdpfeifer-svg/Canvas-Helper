/** Thin-stroke icons for the ambient dock — never emoji / lone unicode. */

type IconProps = { className?: string; title?: string };

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function IconCommand(props: IconProps) {
  return (
    <svg {...base} className={props.className}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} className={props.className}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg {...base} className={props.className}>
      {props.title ? <title>{props.title}</title> : null}
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
