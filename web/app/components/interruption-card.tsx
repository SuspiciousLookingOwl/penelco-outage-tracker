import dayjs from "dayjs";
import { useState } from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { getImageUrl, RecordType, type Interruption, type InterruptionRecord as InterruptionRecordModel } from "~/api";
import { formatDate, formatDateTime, formatTime, formatTimeRange, nowPht } from "~/utils/date";
import { Card } from "./card";
import { Chip } from "./chip";
import { InterruptionStatus, InterruptionStatusType } from "./interruption-status";

const typeStyles: Record<RecordType, string> = {
	[RecordType.Published]: "bg-sky-500/15 text-sky-300",
	[RecordType.Updated]: "bg-amber-500/15 text-amber-300",
	[RecordType.Cancelled]: "bg-rose-500/15 text-rose-300",
};

function highlight(text: string, term: string) {
	if (!term) return text;

	const pattern = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");

	return text.split(pattern).map((part, index) =>
		index % 2 === 1 ? (
			<mark key={index} className="rounded bg-amber-400/30 text-amber-200">
				{part}
			</mark>
		) : (
			part
		)
	);
}

interface InterruptionCardProps {
	interruption: Interruption;
	type: InterruptionStatusType;
	term?: string;
	onPreview: (src: string) => void;
}

export function InterruptionCard({ interruption, type, term = "", onPreview }: InterruptionCardProps) {
	const [isRecordExpanded, setIsRecordExpanded] = useState(false);
	const records = [...interruption.records].sort((a, b) => dayjs(b.createdAt).diff(a.createdAt));
	const lastRecord = records.at(-1);

	return (
		<Card className="space-y-3 p-4">
			<div className="flex space-x-2.5">
				{lastRecord && (
					<img
						src={getImageUrl(lastRecord.recognition?.filename ?? "")}
						alt="Interruption notice"
						onClick={() => onPreview(getImageUrl(lastRecord.recognition?.filename ?? ""))}
						className="aspect-square h-20 cursor-pointer rounded border border-slate-800 object-cover transition-opacity hover:opacity-80"
					/>
				)}

				<div className="space-y-2.5 py-0.5">
					<div className="flex items-center space-x-1.5">
						<h2 className="font-medium text-lg">{highlight(interruption.area, term)}</h2>
						<InterruptionStatus type={type} className="text-xs" />
					</div>
					{interruption.subareas && (
						<p className="text-sm text-slate-300">{highlight(interruption.subareas, term)}</p>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				<Chip className="font-medium text-slate-300">{formatDate(interruption.date)}</Chip>
				{interruption.timeSlots.map((slot, index) => {
					const now = nowPht();
					const start = dayjs(slot.start);
					const end = dayjs(slot.end);

					return (
						<Chip key={index} className="flex items-baseline gap-1.5">
							<span className="font-medium tabular-nums text-slate-200">
								{formatTime(slot.start) ?? "?"}
								<span className="text-slate-500"> – </span>
								{formatTime(slot.end) ?? "?"}
							</span>
							<span className="text-xs text-slate-400">
								({start.from(now)}
								{type === InterruptionStatusType.Ongoing &&
									slot.end &&
									end.add(15, "minutes") > now &&
									", ends " + (now.isAfter(end) ? "soon" : end.from(now))}
								)
							</span>
						</Chip>
					);
				})}
			</div>

			{interruption.reason && <p className="text-sm text-slate-400">{interruption.reason}</p>}

			{records.length > 0 && (
				<div className="space-y-2.5 pt-3">
					<button
						onClick={() => setIsRecordExpanded((value) => !value)}
						className="text-xs w-full cursor-pointer "
					>
						<div className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-400">
							<h3 className="text-xs font-medium tracking-wide  uppercase">Records ({records.length})</h3>
							<div className="border-b border-slate-700 grow"></div>
							<div className="flex items-center">
								{isRecordExpanded ? (
									<>
										<span>(Collapse)</span> <MdExpandLess size={24} />
									</>
								) : (
									<>
										<span>(Expand)</span> <MdExpandMore size={24} />
									</>
								)}
							</div>
						</div>
					</button>
					{isRecordExpanded &&
						records.map((record) => (
							<InterruptionRecord key={record.id} record={record} onPreview={onPreview} />
						))}
				</div>
			)}
		</Card>
	);
}

interface InterruptionRecordProps {
	record: InterruptionRecordModel;
	onPreview: (src: string) => void;
}

function InterruptionRecord({ record, onPreview }: InterruptionRecordProps) {
	const fileName = record.recognition?.filename;
	const src = fileName ? getImageUrl(fileName) : null;
	const range = formatTimeRange(record.timeSlots);
	const recognizedReason = record.recognition?.response?.reason;

	return (
		<div className="flex flex-row gap-1.5">
			{src && (
				<img
					src={src}
					alt="Interruption notice"
					onClick={() => onPreview(src)}
					className="aspect-square h-20 cursor-pointer rounded border border-slate-800 object-cover transition-opacity hover:opacity-80"
				/>
			)}
			<div className="grow space-y-1.5">
				<div className="flex flex-col flex-wrap items-baseline space-x-2 space-y-1 text-sm">
					<div className="flex flex-row items-center space-x-2">
						<span className={`rounded px-1.5 py-0.5 text-xs font-medium ${typeStyles[record.type]}`}>
							{record.type}
						</span>
						<span className="text-xs text-slate-500">
							{formatDateTime(record.recognition.post.timestamp)}
						</span>
					</div>
					<div className="flex flex-row items-center space-x-2">
						<span className="tabular-nums text-slate-300">{formatDate(record.date)}</span>
						{range && <span className="tabular-nums text-slate-400 text-xs">{range}</span>}
					</div>
				</div>
				{recognizedReason && <p className="text-xs text-slate-400">{recognizedReason}</p>}
			</div>
		</div>
	);
}
