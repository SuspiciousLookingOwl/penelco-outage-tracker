import { useEffect } from "react";
import type { IconType } from "react-icons";
import { MdCalendarToday, MdClose } from "react-icons/md";
import { SiGooglecalendar } from "react-icons/si";
import { TbBrandOffice } from "react-icons/tb";
import type { Interruption } from "~/api";
import { CalendarProvider, CalendarUtil } from "~/utils/calendar";
import { formatDate, formatTimeRange } from "~/utils/date";
import { Button } from "./button";

const providerIcons: Record<CalendarProvider, IconType> = {
	[CalendarProvider.Ics]: MdCalendarToday,
	[CalendarProvider.Google]: SiGooglecalendar,
	[CalendarProvider.Outlook]: TbBrandOffice,
};

interface CalendarModalProps {
	interruption: Interruption;
	onClose: () => void;
}

export function CalendarModal({ interruption, onClose }: CalendarModalProps) {
	const options = CalendarUtil.getOptions(interruption);
	const timeRange = formatTimeRange(interruption.timeSlots);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	return (
		<div
			role="dialog"
			onClick={onClose}
			className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/90 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center"
		>
			<div
				onClick={(event) => event.stopPropagation()}
				className="flex max-h-[90vh] w-full max-w-sm flex-col space-y-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-xl"
			>
				<div className="flex items-center justify-between gap-2">
					<h2 className="font-medium text-slate-100">Add to Calendar</h2>
					<Button type="button" variant="icon" title="Close" onClick={onClose}>
						<MdClose className="size-4" />
					</Button>
				</div>

				<p className="text-sm text-slate-300">
					{formatDate(interruption.date)}
					{timeRange && ` · ${timeRange}`}
				</p>

				<div className="flex flex-col gap-2 overflow-y-auto">
					{options.map((option) => {
						const Icon = providerIcons[option.provider];

						return (
							<a
								key={option.key}
								href={option.href}
								download={option.download}
								target={option.download ? undefined : "_blank"}
								rel="noreferrer"
								onClick={onClose}
								className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-800 px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-slate-800/60"
							>
								<Icon className="size-5 shrink-0 text-slate-400" />
								<span>{option.label}</span>
							</a>
						);
					})}
				</div>
			</div>
		</div>
	);
}
