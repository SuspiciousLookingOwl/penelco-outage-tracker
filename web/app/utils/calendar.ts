import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { Interruption } from "~/api";
import { formatTime, PHT_UTC_OFFSET_MINUTES } from "./date";

dayjs.extend(utc);

const PRODID = "-//PENELCO Outage Tracker//EN";
const GOOGLE_URL = "https://calendar.google.com/calendar/render";
const OUTLOOK_URL = "https://outlook.live.com/calendar/0/deeplink/compose";

export enum CalendarProvider {
	Ics = "ics",
	Google = "google",
	Outlook = "outlook",
}

export interface CalendarOption {
	key: string;
	provider: CalendarProvider;
	label: string;
	href: string;
	download?: string;
}

interface CalendarEvent {
	title: string;
	location: string;
	description: string;
	start: string;
	end: string;
}

const escapeIcs = (value: string) =>
	value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const foldLine = (line: string) => {
	const encoder = new TextEncoder();
	if (encoder.encode(line).length <= 75) return line;

	const parts: string[] = [];
	let current = "";
	let size = 0;
	let limit = 75;

	for (const char of line) {
		const charSize = encoder.encode(char).length;
		if (size + charSize > limit) {
			parts.push(current);
			current = char;
			size = charSize;
			limit = 74;
			continue;
		}

		current += char;
		size += charSize;
	}

	parts.push(current);
	return parts.join("\r\n ");
};

const toStamp = (value: string) =>
	dayjs(value).utcOffset(PHT_UTC_OFFSET_MINUTES, true).utc().format("YYYYMMDDTHHmmss[Z]");

const toIso = (value: string) => dayjs(value).utcOffset(PHT_UTC_OFFSET_MINUTES, true).utc().toISOString();

const icsFileName = (interruption: Interruption) => {
	const slug = interruption.area
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	return `power-interruption-${slug || "notice"}-${dayjs(interruption.date).format("YYYY-MM-DD")}.ics`;
};

const getEvents = (interruption: Interruption): CalendarEvent[] => {
	const location = [interruption.area, interruption.subareas].filter(Boolean).join(", ");
	const title = `Power Interruption - ${interruption.area}`;
	const hint = interruption.records.length ? "See the PENELCO Outage Tracker for the original notice." : null;

	return interruption.timeSlots.flatMap((slot) => {
		const start = dayjs(slot.start);
		if (!start.isValid()) return [];

		const end = slot.end ? dayjs(slot.end) : start.utcOffset(PHT_UTC_OFFSET_MINUTES, true).endOf("day");

		return [
			{
				title,
				location,
				description: [location, interruption.reason, slot.label, hint].filter(Boolean).join("\n"),
				start: slot.start,
				end: end.format("YYYY-MM-DD HH:mm:ss"),
			},
		];
	});
};

const googleUrl = (event: CalendarEvent) =>
	`${GOOGLE_URL}?${new URLSearchParams({
		action: "TEMPLATE",
		text: event.title,
		dates: `${toStamp(event.start)}/${toStamp(event.end)}`,
		details: event.description,
		location: event.location,
	})}`;

const outlookUrl = (event: CalendarEvent) =>
	`${OUTLOOK_URL}?${new URLSearchParams({
		path: "/calendar/action/compose",
		rru: "addevent",
		subject: event.title,
		startdt: toIso(event.start),
		enddt: toIso(event.end),
		body: event.description,
		location: event.location,
	})}`;

const providers = [
	{ provider: CalendarProvider.Google, label: "Google Calendar", build: googleUrl },
	{ provider: CalendarProvider.Outlook, label: "Outlook Calendar", build: outlookUrl },
];

export class CalendarUtil {
	static createIcs(interruption: Interruption): string {
		const events = getEvents(interruption);
		if (!events.length) return "";

		const stamp = dayjs().utc().format("YYYYMMDDTHHmmss[Z]");

		return [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			`PRODID:${PRODID}`,
			"CALSCALE:GREGORIAN",
			"METHOD:PUBLISH",
			...events.flatMap((event, index) => [
				"BEGIN:VEVENT",
				`UID:${interruption.id}-${index}@penelco-outage-tracker`,
				`DTSTAMP:${stamp}`,
				`DTSTART:${toStamp(event.start)}`,
				`DTEND:${toStamp(event.end)}`,
				`SUMMARY:${escapeIcs(event.title)}`,
				`LOCATION:${escapeIcs(event.location)}`,
				`DESCRIPTION:${escapeIcs(event.description)}`,
				"STATUS:CONFIRMED",
				"BEGIN:VALARM",
				"TRIGGER:-PT30M",
				"ACTION:DISPLAY",
				`DESCRIPTION:${escapeIcs(event.title)}`,
				"END:VALARM",
				"END:VEVENT",
			]),
			"END:VCALENDAR",
		]
			.map(foldLine)
			.join("\r\n")
			.concat("\r\n");
	}

	static getOptions(interruption: Interruption): CalendarOption[] {
		const events = getEvents(interruption);
		if (!events.length) return [];

		const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(CalendarUtil.createIcs(interruption))}`;

		return [
			{
				key: CalendarProvider.Ics,
				provider: CalendarProvider.Ics,
				label: "Calendar",
				href: ics,
				download: icsFileName(interruption),
			},
			...providers.flatMap(({ provider, label, build }) =>
				events.map((event, index) => ({
					key: `${provider}-${index}`,
					provider,
					label:
						events.length > 1
							? `${label} · ${formatTime(event.start) ?? "?"} – ${formatTime(event.end) ?? "?"}`
							: label,
					href: build(event),
				}))
			),
		];
	}
}
