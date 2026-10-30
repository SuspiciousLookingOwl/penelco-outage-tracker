importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js");

const firebaseConfig = {
	apiKey: "__VITE_FIREBASE_API_KEY__",
	authDomain: "__VITE_FIREBASE_AUTH_DOMAIN__",
	projectId: "__VITE_FIREBASE_PROJECT_ID__",
	messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__",
	appId: "__VITE_FIREBASE_APP_ID__",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
	if (payload.notification) return;

	const title = payload.data?.title ?? "PENELCO Outage Tracker";
	const options = {
		body: payload.data?.body ?? "",
		icon: "/icons/icon-192.png",
		badge: "/icons/icon-192.png",
		data: { url: payload.data?.url ?? "/" },
	};

	self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const url = event.notification.data?.url ?? "/";

	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
			}

			return clients.openWindow(url);
		})
	);
});
