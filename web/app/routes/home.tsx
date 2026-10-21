import { useQuery } from "@tanstack/react-query";
import { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { MdChevronRight, MdExpandMore } from "react-icons/md";
import { getInterruptions, type Interruption } from "~/api";
import { Card } from "~/components/card";
import { Input } from "~/components/input";
import { InterruptionCard } from "~/components/interruption-card";
import { InterruptionStatus, InterruptionStatusType } from "~/components/interruption-status";
import { getInterruptionBounds, nowPht } from "~/utils/date";
import type { Route } from "./+types/home";
import penelcoLogo from "./penelco.png";

export function meta({}: Route.MetaArgs) {
	return [{ title: "PENELCO Outage Tracker" }, { name: "description", content: "Welcome to React Router!" }];
}

type GroupedItem = { item: Interruption; start: Dayjs; end: Dayjs };

export default function Home() {
	const [search, setSearch] = useState("");
	const [preview, setPreview] = useState<string | null>(null);
	const [collapsed, setCollapsed] = useState<Record<InterruptionStatusType, boolean>>({
		[InterruptionStatusType.Past]: true,
		[InterruptionStatusType.Ongoing]: false,
		[InterruptionStatusType.Upcoming]: false,
	});

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

	const term = search.trim().toLowerCase();
	const groups = useMemo(() => {
		const now = nowPht();
		const upcoming: GroupedItem[] = [];
		const ongoing: GroupedItem[] = [];
		const past: GroupedItem[] = [];

		for (const item of query.data ?? []) {
			if (term && !item.area.toLowerCase().includes(term) && !item.subareas?.toLowerCase().includes(term)) {
				continue;
			}

			const { start, end } = getInterruptionBounds(item);
			const entry: GroupedItem = { item, start, end };

			// 15 minute buffer for ongoing interruptions
			if (now.isBefore(start.subtract(15, "minute"))) upcoming.push(entry);
			else if (now.isAfter(end.add(15, "minute"))) past.push(entry);
			else ongoing.push(entry);
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
	}, [query.data, term]);

	const total = groups.reduce((count, group) => count + group.items.length, 0);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
			<header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
				<div className="mx-auto max-w-3xl space-y-3 py-4 px-2 sm:px-4">
					<div className="flex items-center gap-3">
						<img src={penelcoLogo} alt="PENELCO logo" className="w-16 md:w-24 aspect-square" />
						<div className="flex flex-col sm:flex-row sm:items-center grow">
							<div className="flex flex-row md:flex-col items-center sm:items-start space-x-2 grow">
								<h1 className="text-lg sm:text-xl font-semibold">PENELCO </h1>
								<h3 className="text-base sm:text-lg font-semibold">Outage Tracker</h3>
							</div>
							<span className="text-sm text-slate-400">
								{term ? `${total} of ${query.data?.length ?? 0}` : total} listed
							</span>
						</div>
					</div>
					<Input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search places..."
					/>
				</div>
			</header>

			<main className="mx-auto max-w-3xl space-y-3 py-4 px-2 sm:px-4">
				{query.isPending && <p className="text-sm text-slate-400">Loading interruptions...</p>}
				{query.isError && <p className="text-sm text-rose-400">Failed to load interruptions.</p>}
				{!query.isPending && !query.isError && !total && (
					<p className="text-sm text-slate-400">
						{term ? `No interruptions match "${search.trim()}".` : "No interruptions found."}
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
										term={term}
										onPreview={setPreview}
									/>
								))}
						</section>
					);
				})}
			</main>

			{preview && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Interruption notice"
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
		</div>
	);
}
