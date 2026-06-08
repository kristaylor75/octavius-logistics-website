import type { ReactNode } from "react";

/** Centered content measure, capped at --content-max with consistent gutters. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-6 sm:px-8 ${className}`}
      style={{ maxWidth: "var(--content-max)" }}
    >
      {children}
    </div>
  );
}
