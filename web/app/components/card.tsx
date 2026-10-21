import type { ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	className?: string;
	onClick?: () => void;
	expanded?: boolean;
}

export function Card({ children, className = "", onClick, expanded }: CardProps) {
	const classes = `rounded-lg border border-slate-800 bg-slate-900 ${className}`;

	if (onClick) {
		return (
			<button type="button" onClick={onClick} aria-expanded={expanded} className={classes}>
				{children}
			</button>
		);
	}

	return <div className={classes}>{children}</div>;
}
