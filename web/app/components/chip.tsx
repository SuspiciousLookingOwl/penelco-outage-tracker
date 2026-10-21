import type { ReactNode } from "react";

interface ChipProps {
	children: ReactNode;
	className?: string;
}

export function Chip({ children, className = "" }: ChipProps) {
	return (
		<span className={`rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-sm ${className}`}>
			{children}
		</span>
	);
}
