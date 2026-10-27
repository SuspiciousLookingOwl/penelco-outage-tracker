import { format, isValid, parse, parseISO } from "date-fns";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const WALL_CLOCK_FORMAT = "yyyy-MM-dd HH:mm:ss";

type DateInput = Date | string | null | undefined;

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

	public static isDateOnlyString(value: unknown): value is string {
		return typeof value === "string" && DATE_ONLY_PATTERN.test(value);
	}

	public static toDateOnlyString(value: DateInput): string | null {
		return DateUtil.formatCalendarDate(value, "yyyy-MM-dd");
	}

	public static toDayAndMonthString(value: DateInput): string | null {
		return DateUtil.formatCalendarDate(value, "EEE, MMM dd");
	}

	public static toDateTimeStringNoTz(value: DateInput): string | null {
		return DateUtil.formatWallClock(value, WALL_CLOCK_FORMAT);
	}

	public static toTimeStringNoTz(value: DateInput): string | null {
		return DateUtil.formatWallClock(value, "HH:mm");
	}

	private static formatCalendarDate(value: DateInput, pattern: string): string | null {
		const date = DateUtil.parseCalendarDateOrNull(value);
		return date ? format(DateUtil.toWallClockDate(date), pattern) : null;
	}

	private static formatWallClock(value: DateInput, pattern: string): string | null {
		if (typeof value === "string" && WALL_CLOCK_PATTERN.test(value.trim())) {
			return format(parse(value.trim(), WALL_CLOCK_FORMAT, new Date()), pattern);
		}

		const date = DateUtil.parseDateOrNull(value);
		return date ? format(DateUtil.toWallClockDate(date), pattern) : null;
	}

	private static toWallClockDate(date: Date): Date {
		return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
	}
}
