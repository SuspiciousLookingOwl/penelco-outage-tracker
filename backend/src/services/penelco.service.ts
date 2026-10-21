import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";

export interface RawInterruptionResponse {
	filter: string;
	id: string;
	post_id: string;
	time_stamp: string;
	content: string;
	type: string;
	images: string[];
}

export interface InterruptionResponse {
	filter: string;
	id: string;
	postId: string;
	/** Instant the post was published. */
	timestamp: Date;
	content: string;
	type: string;
	images: string[];
}

@Injectable()
export class PenelcoService {
	private static BASE_URL = "https://penelco.com";
	private readonly interruptions: InterruptionResponse[] = [];

	constructor(private readonly httpService: HttpService) {}

	async getInterruptions(start: number, limit = 5): Promise<InterruptionResponse[]> {
		const url = new URL("/webapp/app_posts_manager/fetch_posts.php", PenelcoService.BASE_URL);
		url.searchParams.append("filter", "interruption");
		url.searchParams.append("start", start.toString());
		url.searchParams.append("limit", limit.toString());

		const response = await this.httpService.axiosRef.get<RawInterruptionResponse[]>(url.toString());

		const data: InterruptionResponse[] = response.data
			// The `filter` param doesn't seem to work, `other` post is still returned
			.filter((d) => d.type === "interruption")
			.map((d) => ({
				filter: d.filter,
				id: d.id,
				postId: d.post_id,
				timestamp: new Date(d.time_stamp),
				content: d.content,
				type: d.type,
				images: d.images,
			}));
		this.interruptions.push(...data);

		return data;
	}

	getById(id: string): InterruptionResponse | undefined {
		return this.interruptions.find((interruption) => interruption.id === id);
	}

	getInterruptionImages(id: string, index = 0): string | undefined {
		const interruption = this.interruptions.find((item) => item.id === id);
		const image = interruption?.images[index];
		if (!image) return undefined;

		return image;
	}
}
