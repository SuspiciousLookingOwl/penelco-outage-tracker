import { isValid, parse, parseISO } from "date-fns";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export class DateUtil {
	public static parseDateOrNull(value: Date | string | null | undefined): Date | null {
		if (value === null || value === undefined || value === "") return null;
		if (value instanceof Date) return isValid(value) ? value : null;
		if (typeof value !== "string") return null;

		const iso = parseISO(value);
		if (isValid(iso)) return iso;

		const verbose = parse(value.trim(), "MMMM d, yyyy", new Date());
		return isValid(verbose) ? verbose : null;
	}

	public static parseCalendarDateOrNull(value: Date | string | null | undefined): Date | null {
		if (DateUtil.isDateOnlyString(value)) {
			return new Date(`${value}T00:00:00.000Z`);
		}

		const parsed = DateUtil.parseDateOrNull(value);
		if (!parsed) return null;

		return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
	}

	public static isDateOnlyString(value: unknown): value is string {
		return typeof value === "string" && DATE_ONLY_PATTERN.test(value);
	}

	public static toDateOnlyString(value: Date | string | null | undefined): string | null {
		const date = DateUtil.parseCalendarDateOrNull(value);
		if (!date) return null;

		return [date.getUTCFullYear(), DateUtil.pad(date.getUTCMonth() + 1), DateUtil.pad(date.getUTCDate())].join("-");
	}

	public static toDateTimeStringNoTz(value: Date | string | null | undefined): string | null {
		// Already a wall clock string: return as is. Re-parsing it would treat the
		// value as an instant and shift it by the server timezone.
		if (typeof value === "string" && WALL_CLOCK_PATTERN.test(value.trim())) {
			return value.trim();
		}

		const date = DateUtil.parseDateOrNull(value);
		if (!date) return null;

		return [
			[date.getUTCFullYear(), DateUtil.pad(date.getUTCMonth() + 1), DateUtil.pad(date.getUTCDate())].join("-"),
			[
				DateUtil.pad(date.getUTCHours()),
				DateUtil.pad(date.getUTCMinutes()),
				DateUtil.pad(date.getUTCSeconds()),
			].join(":"),
		].join(" ");
	}

	private static pad(n: number): string {
		return String(n).padStart(2, "0");
	}
}
