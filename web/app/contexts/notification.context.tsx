import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, onRegistered, register, unregister, type Messaging } from "firebase/messaging";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSubscription, deleteSubscription } from "~/api";

const SERVICE_WORKER_URL = "/firebase-messaging-sw.js";
const FID_KEY = "penelco:fid";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const isPushSupported = async () => {
	if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) return false;
	return isSupported().catch(() => false);
};

const getMessagingInstance = async () => {
	if (messaging) return messaging;
	if (!(await isPushSupported())) return null;

	app ??= initializeApp({
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
		authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
		projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
		messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
		appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
	});

	return (messaging ??= getMessaging(app));
};

export enum NotificationStatus {
	Checking,
	Unsupported,
	Denied,
	Failed,
	Ready,
}

export interface NotificationContextValue {
	status: NotificationStatus;
	fid: string | null;
	subscribe: () => Promise<void>;
	unsubscribe: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
	const [status, setStatus] = useState<NotificationStatus>(NotificationStatus.Checking);
	const [fid, setFid] = useState<string | null>(null);

	const isSubscribedRef = useRef(false);

	useEffect(() => {
		let stopListening: (() => void) | undefined;
		let active = true;

		void (async () => {
			if (!(await isPushSupported())) return active && setStatus(NotificationStatus.Unsupported);
			if (Notification.permission === "denied") return active && setStatus(NotificationStatus.Denied);
			if (!active) return;

			const instance = await getMessagingInstance();
			if (!instance) return setStatus(NotificationStatus.Unsupported);

			stopListening = onRegistered(instance, async (nextFid) => {
				if (!isSubscribedRef.current) return;

				localStorage.setItem(FID_KEY, nextFid);
				setFid(nextFid);

				await createSubscription(nextFid).catch(() => undefined);
			});

			setStatus(NotificationStatus.Ready);
			setFid(localStorage.getItem(FID_KEY));
		})();

		return () => {
			active = false;
			stopListening?.();
		};
	}, []);

	const subscribe = useCallback(async () => {
		if ((await Notification.requestPermission()) !== "granted") {
			return setStatus(NotificationStatus.Denied);
		}

		const instance = await getMessagingInstance();
		if (!instance) return setStatus(NotificationStatus.Unsupported);

		try {
			const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
			await navigator.serviceWorker.ready;

			isSubscribedRef.current = true;

			await register(instance, {
				vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "",
				serviceWorkerRegistration: registration,
			});
		} catch {
			isSubscribedRef.current = false;
			setStatus(NotificationStatus.Failed);
		}
	}, []);

	const unsubscribe = useCallback(async () => {
		const current = localStorage.getItem(FID_KEY);

		isSubscribedRef.current = false;

		const instance = await getMessagingInstance();
		if (instance) await unregister(instance).catch(() => undefined);
		if (current) await deleteSubscription(current).catch(() => undefined);

		localStorage.removeItem(FID_KEY);
		setFid(null);
	}, []);

	const value = useMemo(() => ({ status, fid, subscribe, unsubscribe }), [status, fid, subscribe, unsubscribe]);

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
	const context = useContext(NotificationContext);
	if (!context) throw new Error("NotificationProvider Context not found");
	return context;
};
