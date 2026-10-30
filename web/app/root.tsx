import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigate } from "react-router";

import "@khmyznikov/pwa-install";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { NotificationProvider } from "~/contexts/notification.context";
import { PwaProvider } from "~/contexts/pwa.context";

const queryClient = new QueryClient();

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
	{ rel: "manifest", href: "/manifest.json" },
	{ rel: "icon", href: "/favicon.ico" },
	{ rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
				<meta name="apple-mobile-web-app-title" content="PENELCO Outage Tracker" />
				<meta name="theme-color" content="#020618" />
				<Meta />
				<Links />
			</head>
			<body>
				<pwa-install manual-apple="true" manual-chrome="true" />
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	const navigate = useNavigate();

	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;

		const onMessage = (event: MessageEvent) => {
			const message = event.data;
			if (message?.messageType !== "notification-clicked") return;

			const url = message.data?.url;
			if (url) navigate(url);
		};

		navigator.serviceWorker.addEventListener("message", onMessage);
		return () => navigator.serviceWorker.removeEventListener("message", onMessage);
	}, [navigate]);

	return (
		<QueryClientProvider client={queryClient}>
			<PwaProvider>
				<NotificationProvider>
					<Outlet />
				</NotificationProvider>
			</PwaProvider>
		</QueryClientProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
