import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { MdAdd, MdClose, MdNotificationsOff } from "react-icons/md";
import { createSubscription, getSubscription, updateSubscription } from "~/api";
import { NotificationStatus, useNotification } from "~/contexts/notification.context";
import { usePwa } from "~/contexts/pwa.context";
import { Button } from "./button";
import { Input } from "./input";

const MAX_KEYWORDS = 15;
const MIN_KEYWORD_LENGTH = 3;
const MAX_KEYWORD_LENGTH = 50;

interface LoadedSubscription {
	token: string;
	keywords: string[];
	subscribeToAll: boolean;
}

const NotificationsForm = ({
	token,
	keywords,
	subscribeToAll,
	onClose,
}: LoadedSubscription & { onClose: () => void }) => {
	const { unsubscribe } = useNotification();
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { keywords: keywords.length ? keywords : [""], subscribeToAll },
		onSubmit: async ({ value }) => {
			setError(null);

			const keywords = [
				...new Set(
					value.keywords.map((keyword) => keyword.trim().slice(0, MAX_KEYWORD_LENGTH)).filter(Boolean)
				),
			];

			try {
				await updateSubscription(token, keywords, value.subscribeToAll);
				onClose();
			} catch {
				setError("Could not save your keywords. Please try again.");
			}
		},
	});

	const onTurnOff = async () => {
		if (!confirm("Turn off notifications? You will stop receiving interruption alerts.")) return;
		await unsubscribe();
		onClose();
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="flex min-h-0 flex-1 flex-col space-y-3"
		>
			<p className="text-sm text-slate-400">
				You'll be notified when an interruption notice mentions any of the keywords you provide. Put your city /
				municipality, barangay, subdivision, nearby establishments, etc.
			</p>

			<form.Field name="subscribeToAll">
				{(field) => (
					<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
						<input
							type="checkbox"
							checked={field.state.value}
							onChange={(event) => field.handleChange(event.target.checked)}
							className="size-4 cursor-pointer accent-sky-500"
						/>
						<span>Subscribe to All</span>
					</label>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.values.subscribeToAll}>
				{(subscribedToAll) => (
					<form.Field name="keywords">
						{(keywordsField) => (
							<>
								<div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
									{keywordsField.state.value.map((_, index) => (
										<form.Field
											key={index}
											name={`keywords[${index}]`}
											validators={{
												onChange: ({ value }) =>
													value.trim().length >= MIN_KEYWORD_LENGTH
														? undefined
														: `At least ${MIN_KEYWORD_LENGTH} characters`,
											}}
										>
											{(field) => (
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<Input
															value={field.state.value}
															maxLength={MAX_KEYWORD_LENGTH}
															placeholder="e.g. Poblacion"
															disabled={subscribedToAll}
															onChange={(event) => field.handleChange(event.target.value)}
															onBlur={field.handleBlur}
															className="disabled:cursor-not-allowed disabled:opacity-50"
														/>
														<Button
															type="button"
															variant="icon"
															title="Remove keyword"
															disabled={subscribedToAll}
															onClick={() => keywordsField.removeValue(index)}
															className="border-slate-800 hover:border-rose-500/40 hover:text-rose-300"
														>
															<MdClose className="size-4" />
														</Button>
													</div>

													{field.state.meta.errors.length > 0 && (
														<p className="text-xs text-rose-400">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										</form.Field>
									))}
								</div>

								<Button
									type="button"
									onClick={() => keywordsField.pushValue("")}
									disabled={subscribedToAll || keywordsField.state.value.length >= MAX_KEYWORDS}
								>
									<MdAdd className="size-4" />
									<span>Add more keyword</span>
								</Button>

								<p className="text-xs text-slate-500">
									{keywordsField.state.value.length} of {MAX_KEYWORDS} keywords · {MIN_KEYWORD_LENGTH}
									-{MAX_KEYWORD_LENGTH} characters each
								</p>
							</>
						)}
					</form.Field>
				)}
			</form.Subscribe>

			{error && <p className="text-xs text-rose-400">{error}</p>}

			<div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
				<Button type="button" variant="danger" onClick={onTurnOff}>
					<MdNotificationsOff className="size-4" />
					<span>Turn off</span>
				</Button>

				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" variant="primary" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
};

export const NotificationsModal = ({ onClose }: { onClose: () => void }) => {
	const { needsInstall, showInstallTutorial } = usePwa();
	const { status, fid, subscribe } = useNotification();

	const [loaded, setLoaded] = useState<LoadedSubscription | null>(null);
	const [failed, setFailed] = useState(false);
	const requested = useRef(false);

	const view = needsInstall
		? "install"
		: status === NotificationStatus.Ready
			? fid && loaded
				? "keywords"
				: failed
					? "failed"
					: "loading"
			: status === NotificationStatus.Checking
				? "loading"
				: status === NotificationStatus.Unsupported
					? "unsupported"
					: status === NotificationStatus.Denied
						? "denied"
						: "failed";

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	useEffect(() => {
		if (needsInstall || status !== NotificationStatus.Ready || loaded) return;

		if (!fid) {
			if (requested.current) return;

			requested.current = true;
			void subscribe();
			return;
		}

		let active = true;

		void (async () => {
			const details = await getSubscription(fid).catch(() => null);
			if (!active) return;

			if (details) {
				setLoaded({
					token: fid,
					keywords: details.keywords,
					subscribeToAll: details.isSubscribedToAllInterruptions,
				});
				return;
			}

			const recreated = await createSubscription(fid).then(
				() => true,
				() => false
			);
			if (!active) return;

			if (recreated) setLoaded({ token: fid, keywords: [], subscribeToAll: false });
			else setFailed(true);
		})();

		return () => {
			active = false;
		};
	}, [needsInstall, status, fid, loaded, subscribe]);

	return (
		<div
			role="dialog"
			onClick={onClose}
			className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/90 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center"
		>
			<div
				onClick={(event) => event.stopPropagation()}
				className="flex max-h-[90vh] w-full max-w-md flex-col space-y-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl"
			>
				<div className="flex items-center justify-between gap-2">
					<h2 className="font-medium text-slate-100">Notifications</h2>
					<Button type="button" variant="icon" title="Close" onClick={onClose}>
						<MdClose className="size-4" />
					</Button>
				</div>

				{view === "loading" && <p className="text-sm text-slate-400">Setting up notifications...</p>}

				{view === "install" && (
					<div className="space-y-3 text-sm text-slate-300">
						<p>
							On iPhone and iPad, notifications only work after adding this page to your Home Screen and
							opening it from there.
						</p>
						<ol className="list-decimal space-y-1 pl-5 text-slate-400">
							<li>Tap the Share button in Safari.</li>
							<li>Choose &quot;Add to Home Screen&quot;.</li>
							<li>Open PENELCO from your Home Screen and tap Notify me again.</li>
						</ol>
						<Button type="button" variant="primary" block onClick={showInstallTutorial}>
							Show install instructions
						</Button>
					</div>
				)}

				{view === "unsupported" && (
					<p className="text-sm text-amber-200">
						Push notifications are not supported in this browser. Try Chrome, Edge, or install the app to
						your home screen.
					</p>
				)}

				{view === "denied" && (
					<p className="text-sm text-amber-200">
						Notifications are blocked. Allow them for this site in your browser settings, then try again.
					</p>
				)}

				{view === "failed" && (
					<p className="text-sm text-amber-200">
						Could not set up notifications. Check your connection and try again.
					</p>
				)}

				{view === "keywords" && loaded && <NotificationsForm {...loaded} onClose={onClose} />}
			</div>
		</div>
	);
};
