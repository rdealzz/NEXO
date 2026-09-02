import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Botões 3D do NEXO.
 *
 * O relevo mora em `.btn` (src/app/globals.css) — aqui é só a montagem das
 * classes, para que um `<button>`, um `<Link>` e um `<a>` fiquem idênticos.
 */
export type ButtonVariant = "primary" | "surface" | "soft" | "danger" | "ghost";
export type ButtonSize = "lg" | "md" | "sm" | "chip" | "icon";

type Look = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  lg: "btn--lg",
  md: "",
  sm: "btn--sm",
  chip: "btn--chip",
  icon: "btn--icon",
};

export function botaoClasses({ variant = "surface", size = "md", block, className }: Look = {}): string {
  return ["btn", `btn--${variant}`, SIZE_CLASS[size], block ? "btn--block" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Botao({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: Look & ComponentProps<"button">) {
  return <button type={type} className={botaoClasses({ variant, size, block, className })} {...props} />;
}

export function BotaoLink({
  variant,
  size,
  block,
  className,
  ...props
}: Look & ComponentProps<typeof Link>) {
  return <Link className={botaoClasses({ variant, size, block, className })} {...props} />;
}

export function BotaoAncora({ variant, size, block, className, ...props }: Look & ComponentProps<"a">) {
  return <a className={botaoClasses({ variant, size, block, className })} {...props} />;
}
