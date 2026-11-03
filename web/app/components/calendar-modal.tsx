import { useEffect } from "react";
import type { IconType } from "react-icons";
import { MdCalendarToday, MdClose } from "react-icons/md";
import { SiGooglecalendar } from "react-icons/si";
import { TbBrandOffice } from "react-icons/tb";
import type { Interruption } from "~/api";
import { CalendarProvider, CalendarUtil, type IcsCalendarOption } from "~/utils/calendar";
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

	const handleIcs = async (option: IcsCalendarOption) => {
		const file = new File([CalendarUtil.createIcs(interruption)], option.fileName, { type: "text/calendar" });

		if (navigator.canShare?.({ files: [file] })) {
			try {
				await navigator.share({ files: [file] });
				onClose();
				return;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
			}
		}

		const url = URL.createObjectURL(file);
		const link = document.createElement("a");
		link.href = url;
		link.download = option.fileName;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		onClose();
	};

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
						const rowClassName =
							"flex w-full cursor-pointer items-center gap-3 rounded-md border border-slate-800 px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800/60";

						if (option.provider === CalendarProvider.Ics) {
							return (
								<button
									key={option.key}
									type="button"
									onClick={() => void handleIcs(option)}
									className={rowClassName}
								>
									<Icon className="size-5 shrink-0 text-slate-400" />
									<span>{option.label}</span>
								</button>
							);
						}

						return (
							<a
								key={option.key}
								href={option.href}
								target="_blank"
								rel="noreferrer"
								onClick={onClose}
								className={rowClassName}
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
