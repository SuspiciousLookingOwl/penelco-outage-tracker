import { useQuery } from "@tanstack/react-query";
import { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MdChevronRight, MdExpandMore, MdNotificationsActive, MdNotificationsOff } from "react-icons/md";
import { getInterruptions, type Interruption } from "~/api";
import { Button } from "~/components/button";
import { Card } from "~/components/card";
import { Input } from "~/components/input";
import { InterruptionCard } from "~/components/interruption-card";
import { InterruptionStatus, InterruptionStatusType } from "~/components/interruption-status";
import { NotificationsModal } from "~/components/notifications-modal";
import { useNotification } from "~/contexts/notification.context";
import { getInterruptionBounds, nowPht } from "~/utils/date";
import { normalize } from "~/utils/string";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
	return [{ title: "PENELCO Outage Tracker" }, { name: "description", content: "Welcome to React Router!" }];
}

type GroupedItem = { item: Interruption; start: Dayjs; end: Dayjs };

export default function Home() {
	const [search, setSearch] = useState("");
	const [preview, setPreview] = useState<string | null>(null);
	const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
	const [collapsed, setCollapsed] = useState<Record<InterruptionStatusType, boolean>>({
		[InterruptionStatusType.Past]: true,
		[InterruptionStatusType.Ongoing]: false,
		[InterruptionStatusType.Upcoming]: false,
	});

	const { fid } = useNotification();

	useEffect(() => {
		if (!preview) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setPreview(null);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [preview]);

	const query = useQuery({
		queryKey: ["interruptions"],
		queryFn: getInterruptions,
	});

	const groups = useMemo(() => {
		const term = normalize(search);
		const now = nowPht();
		const upcoming: GroupedItem[] = [];
		const ongoing: GroupedItem[] = [];
		const past: GroupedItem[] = [];

		// 15 minute buffer for ongoing interruptions
		const isOngoing = (start: Dayjs, end: Dayjs) =>
			!now.isBefore(start.subtract(15, "minute")) && !now.isAfter(end.add(15, "minute"));

		for (const item of query.data ?? []) {
			if (term && !normalize(item.area).includes(term) && !normalize(item.subareas).includes(term)) {
				continue;
			}

			const bounds = getInterruptionBounds(item).sort((a, b) => a.start.diff(b.start));
			if (!bounds.length) continue;

			const active = bounds.find(({ start, end }) => isOngoing(start, end));
			const next = bounds.find(({ start }) => now.isBefore(start.subtract(15, "minute")));
			const last = bounds.reduce((latest, bound) => (bound.end.isAfter(latest.end) ? bound : latest));

			if (active) ongoing.push({ item, ...active });
			else if (next) upcoming.push({ item, ...next });
			else past.push({ item, ...last });
		}

		const newestFirst = (a: GroupedItem, b: GroupedItem) => b.start.diff(a.start);

		upcoming.sort(newestFirst).reverse();
		ongoing.sort(newestFirst).reverse();
		past.sort(newestFirst);

		return [
			{ key: InterruptionStatusType.Ongoing, items: ongoing },
			{ key: InterruptionStatusType.Upcoming, items: upcoming },
			{ key: InterruptionStatusType.Past, items: past },
		];
	}, [query.data, search]);

	const total = groups.reduce((count, group) => count + group.items.length, 0);

	return (
		<div className="min-h-screen text-slate-100 pb-32">
			<header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
				<div className="mx-auto max-w-3xl space-y-3 py-4 px-2 sm:px-4">
					<div className="flex items-center gap-3">
						<img src="./power-outage.png" alt="PENELCO logo" className="w-16 md:w-24 p-2.5 aspect-square" />
						<div className="flex flex-col sm:flex-row sm:items-center grow">
							<div className="flex flex-row md:flex-col items-center sm:items-start space-x-2 grow">
								<h1 className="text-lg sm:text-2xl font-semibold">PENELCO </h1>
								<h3 className="text-base sm:text-xl font-semibold my-auto">Outage Tracker</h3>
							</div>
							<span className="text-sm text-slate-400">
								{search ? `${total} of ${query.data?.length ?? 0}` : total} listed
							</span>
						</div>
					</div>
					<div className="flex flex-col-reverse sm:flex-row items-center gap-2">
						<Input
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search places..."
						/>
						<Button
							type="button"
							onClick={() => setIsNotificationModalOpen(true)}
							className={`w-full sm:max-w-max ${fid ? "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25" : "bg-slate-900"}`}
						>
							{fid ? (
								<MdNotificationsActive className="size-4" />
							) : (
								<MdNotificationsOff className="size-4" />
							)}
							<span>{fid ? "Notification" : "Notify me"}</span>
						</Button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-3xl space-y-3 py-4 px-2 sm:px-4">
				{query.isPending && <p className="text-sm text-slate-400">Loading interruptions...</p>}
				{query.isError && <p className="text-sm text-rose-400">Failed to load interruptions.</p>}
				{!query.isPending && !query.isError && !total && (
					<p className="text-sm text-slate-400">
						{search ? `No interruptions match "${search.trim()}".` : "No interruptions found."}
					</p>
				)}

				{groups.map((group) => {
					if (!group.items.length) return null;

					const open = !collapsed[group.key];

					return (
						<section key={group.key} className="space-y-3">
							<Card
								onClick={() => setCollapsed((value) => ({ ...value, [group.key]: !value[group.key] }))}
								expanded={open}
								className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 cursor-pointer hover:border-slate-700 hover:text-slate-100"
							>
								{open ? (
									<MdExpandMore className="size-4 text-slate-500" />
								) : (
									<MdChevronRight className="size-4 text-slate-500" />
								)}
								<InterruptionStatus type={group.key} />
								{group.key === InterruptionStatusType.Past && (
									<span className="text-xs font-normal text-slate-500">(up to 14 days ago)</span>
								)}
								<span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
									{group.items.length}
								</span>
							</Card>

							{open &&
								group.items.map(({ item }) => (
									<InterruptionCard
										key={item.id}
										type={group.key}
										interruption={item}
										highlightedText={search}
										onPreview={setPreview}
									/>
								))}
						</section>
					);
				})}
			</main>

			{preview && (
				<div
					onClick={() => setPreview(null)}
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
				>
					<button
						title="Close"
						onClick={() => setPreview(null)}
						className="absolute top-4 right-4 rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
					>
						Close
					</button>
					<img
						src={preview}
						alt="Interruption notice"
						onClick={(event) => event.stopPropagation()}
						className="max-h-full max-w-full rounded-lg object-contain"
					/>
				</div>
			)}

			{isNotificationModalOpen &&
				createPortal(<NotificationsModal onClose={() => setIsNotificationModalOpen(false)} />, document.body)}
		</div>
	);
}
