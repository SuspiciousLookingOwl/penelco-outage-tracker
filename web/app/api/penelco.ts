import axios from "axios";

export interface Interruption {
	id: string;
	interruptionPostId: string;
	date: string;
	timeSlots: RecordTimeSlot[];
	area: string;
	subareas: null | string;
	reason: null | string;
	createdAt: string;
	updatedAt: string;
	records: InterruptionRecord[];
}

export interface InterruptionPost {
	id: string;
	filter: string;
	postId: string;
	timestamp: string;
	content: string;
	type: string;
	images: string[];
	createdAt: string;
	updatedAt: string;
}

export interface InterruptionRecord {
	id: string;
	interruptionId: string;
	interruptionRecognitionId: string;
	date: string;
	timeSlots: RecordTimeSlot[];
	area: string;
	subareas: null | string;
	reason: null | string;
	type: Type;
	createdAt: string;
	updatedAt: string;
	recognition: InterruptionRecognition;
}

export interface InterruptionRecognition {
	id: string;
	interruptionPostId: string;
	filename: string | null;
	success: boolean;
	response: InterruptionRecognitionResponse;
	post: InterruptionPost;
	createdAt: string;
	updatedAt: string;
}

export interface InterruptionRecognitionResponse {
	area: string[];
	date: string;
	type: Type;
	reason: null | string;
	rawText: string;
	subareas: string[];
	dayOfWeek: null | string;
	timeSlots: TimeSlot[];
	confidence: number;
	formerTimeSlots: TimeSlot[];
	restorationTime: null | string;
}

export interface TimeSlot {
	to: string | null;
	from: string | null;
	label: string | null;
}

export enum Type {
	Cancelled = "CANCELLED",
	Published = "PUBLISHED",
	Updated = "UPDATED",
}

export interface RecordTimeSlot {
	start: string;
	end: string | null;
	label: string | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export const getInterruptions = async () => {
	const response = await axios.get<Interruption[]>(`${API_URL}/interruptions`);
	return response.data;
};

export const getImageUrl = (filename: string) => `${API_URL}/images/${filename}`;
