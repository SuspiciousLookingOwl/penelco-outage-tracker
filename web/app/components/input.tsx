import type { InputHTMLAttributes } from "react";
import { controlSizes, type ControlSize } from "./sizes";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
	size?: ControlSize;
}

export function Input({ size = "md", className = "", ...props }: InputProps) {
	return (
		<input
			{...props}
			className={`w-full rounded-md border text-slate-200 border-slate-800 bg-slate-900 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none ${controlSizes[size]} ${className}`}
		/>
	);
}
