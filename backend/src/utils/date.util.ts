import { format as formatDate, isValid, parse, parseISO } from "date-fns";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export const DATE_FORMAT = "yyyy-MM-dd";
export const DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

type DateInput = Date | string | null | undefined;

export interface ParsedTimeSlot {
	from: string | null;
	to: string | null;
	label: string | null;
}

export interface TimeSlotStrings {
	start: string | null;
	end: string | null;
	label: string | null;
}

export class DateUtil {
	public static parseDateOrNull(value: DateInput): Date | null {
		if (!value) return null;
		if (value instanceof Date) return isValid(value) ? value : null;
		if (typeof value !== "string") return null;

		const candidates = [parseISO(value), parse(value.trim(), "MMMM d, yyyy", new Date())];
		return candidates.find((candidate) => isValid(candidate)) ?? null;
	}

	public static parseCalendarDateOrNull(value: DateInput): Date | null {
		if (DateUtil.isDateOnlyString(value)) return new Date(`${value}T00:00:00.000Z`);

		const parsed = DateUtil.parseDateOrNull(value);
		if (!parsed) return null;

		return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
	}

	public static format(value: DateInput, pattern: string): string | null {
		if (typeof value === "string" && WALL_CLOCK_PATTERN.test(value.trim())) {
			return formatDate(parse(value.trim(), DATE_TIME_FORMAT, new Date()), pattern);
		}

		const date = DateUtil.parseDateOrNull(value);
		return date ? formatDate(new Date(date.getTime() + date.getTimezoneOffset() * 60_000), pattern) : null;
	}

	public static toTimeSlots(date: Date, slots: ParsedTimeSlot[]): TimeSlotStrings[] {
		return slots.map((slot) => ({
			start: DateUtil.toDateTimeStringFromTime(date, slot.from),
			end: DateUtil.toDateTimeStringFromTime(date, slot.to),
			label: slot.label,
		}));
	}

	private static isDateOnlyString(value: unknown): value is string {
		return typeof value === "string" && DATE_ONLY_PATTERN.test(value);
	}

	private static toDateTimeStringFromTime(date: Date, hhmm: string | null): string | null {
		if (!hhmm) return null;

		const time = parse(hhmm.trim(), "H:mm", date);
		if (!isValid(time)) return null;

		const dateOnly = DateUtil.format(date, DATE_FORMAT);
		return dateOnly ? `${dateOnly} ${formatDate(time, "HH:mm:ss")}` : null;
	}
}
