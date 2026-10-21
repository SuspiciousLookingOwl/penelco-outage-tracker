import dayjs, { type Dayjs } from "dayjs";
import minMax from "dayjs/plugin/minMax";
import type { Interruption, RecordTimeSlot } from "~/api";

dayjs.extend(minMax);

export function formatDate(value: string) {
	const date = dayjs(value);
	return date.isValid() ? date.format("dddd, MMMM D") : value;
}

export function formatTime(value: string | null) {
	return value ? dayjs(value).format("HH:mm") : null;
}

export function formatTimeRange(slots: RecordTimeSlot[]) {
	if (!slots.length) return null;

	return slots.map((slot) => `${formatTime(slot.start) ?? "?"} - ${formatTime(slot.end) ?? "?"}`).join(", ");
}

export function formatDateTime(value: string) {
	const date = dayjs(value);
	return date.isValid() ? date.format("MMM D, hh:mm A") : value;
}

export function getInterruptionBounds(item: Interruption): { start: Dayjs; end: Dayjs } {
	const day = dayjs(item.date);
	const starts = item.timeSlots.map((slot) => dayjs(slot.start)).filter((date) => date.isValid());
	const ends = item.timeSlots.map((slot) => dayjs(slot.end)).filter((date) => date.isValid());

	const start = dayjs.min(starts) ?? day.startOf("day");
	const end = dayjs.max(ends) ?? day.endOf("day");

	return { start, end: end.isBefore(start) ? day.endOf("day") : end };
}
