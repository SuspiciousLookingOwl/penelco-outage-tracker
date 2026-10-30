import type { ButtonHTMLAttributes } from "react";
import { controlSizes, iconSizes, type ControlSize } from "./sizes";

export type ButtonVariant = "primary" | "danger" | "default" | "icon";

export type ButtonSize = ControlSize;

const variants: Record<ButtonVariant, string> = {
	primary: "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25",
	danger: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
	default: "border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100",
	icon: "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	block?: boolean;
}

export function Button({ variant = "default", size = "md", block = false, className = "", ...props }: ButtonProps) {
	const classes = [
		"flex cursor-pointer items-center justify-center gap-1.5 rounded-md border font-medium transition-colors",
		"disabled:cursor-not-allowed disabled:opacity-50",
		variant === "icon" ? iconSizes[size] : controlSizes[size],
		variants[variant],
		block ? "w-full" : "",
		className,
	];

	return <button {...props} className={classes.filter(Boolean).join(" ")} />;
}
