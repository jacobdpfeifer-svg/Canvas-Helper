import type { CSSProperties } from "react";

function toCssLength(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

export function Skeleton({
  className,
  width,
  height,
  style,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}) {
  const merged: CSSProperties = {
    ...style,
    width: toCssLength(width) ?? style?.width,
    height: toCssLength(height) ?? style?.height,
  };

  return (
    <span
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={merged}
      aria-hidden="true"
    />
  );
}
