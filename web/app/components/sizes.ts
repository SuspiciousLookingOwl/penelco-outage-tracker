export type ControlSize = "sm" | "md";

export const controlSizes: Record<ControlSize, string> = {
	sm: "px-2.5 py-1.5 text-xs",
	md: "px-3 py-2 text-sm",
};

export const iconSizes: Record<ControlSize, string> = {
	sm: "p-1.5",
	md: "p-2.5",
};
