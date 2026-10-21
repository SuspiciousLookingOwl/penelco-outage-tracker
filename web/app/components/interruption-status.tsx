import classNames from "classnames";
import { GoDotFill } from "react-icons/go";

export enum InterruptionStatusType {
	Ongoing = "Ongoing",
	Upcoming = "Upcoming",
	Past = "Past",
}

interface StatusProps {
	type: InterruptionStatusType;
	className?: string;
}

export function InterruptionStatus({ type, className }: StatusProps) {
	return (
		<div
			className={classNames("flex items-center space-x-0.5", className, {
				"text-red-400 animate-pulse": type === InterruptionStatusType.Ongoing,
				"text-amber-300": type === InterruptionStatusType.Upcoming,
				"text-slate-400": type === InterruptionStatusType.Past,
			})}
		>
			<GoDotFill />
			<span>{type}</span>
		</div>
	);
}
