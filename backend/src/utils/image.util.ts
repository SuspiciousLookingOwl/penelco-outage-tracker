export class ImageUtil {
	public static detectImageMimeType(base64: string): string {
		const value = base64.trimStart();

		if (value.startsWith("data:")) return value.slice(5, value.indexOf(";"));
		if (value.startsWith("/9j/")) return "image/jpeg";
		if (value.startsWith("iVBORw0KGgo")) return "image/png";
		if (value.startsWith("R0lGOD")) return "image/gif";
		if (value.startsWith("UklGR")) return "image/webp";
		if (value.startsWith("Qk")) return "image/bmp";

		return "image/jpeg";
	}

	public static toDataUri(base64: string): string {
		const value = base64.trim();

		if (value.startsWith("data:")) return value;

		return `data:${ImageUtil.detectImageMimeType(value)};base64,${value}`;
	}
}
