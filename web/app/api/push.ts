import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export interface PushSubscriptionDetails {
	keywords: string[];
	isSubscribedToAllInterruptions: boolean;
}

export const createSubscription = async (fid: string): Promise<void> => {
	await axios.post(`${API_URL}/push/subscriptions`, { fid });
};

export const getSubscription = async (fid: string): Promise<PushSubscriptionDetails | null> => {
	try {
		const { data } = await axios.get<PushSubscriptionDetails>(
			`${API_URL}/push/subscriptions/${encodeURIComponent(fid)}`
		);

		return data;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) return null;

		throw error;
	}
};

export const updateSubscription = async (
	fid: string,
	keywords: string[],
	isSubscribedToAllInterruptions: boolean
): Promise<PushSubscriptionDetails> => {
	const { data } = await axios.patch<PushSubscriptionDetails>(
		`${API_URL}/push/subscriptions/${encodeURIComponent(fid)}`,
		{ keywords, isSubscribedToAllInterruptions }
	);

	return data;
};

export const deleteSubscription = async (fid: string): Promise<void> => {
	await axios.delete(`${API_URL}/push/subscriptions/${encodeURIComponent(fid)}`);
};
