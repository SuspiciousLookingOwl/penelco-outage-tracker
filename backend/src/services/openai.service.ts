import { Inject, Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ImageUtil } from "../utils";

export interface OpenAiServiceOptions {
	baseUrl: string;
	models: string[];
	apiKey: string;
	timeoutMs?: number;
	maxRetries?: number;
	imageDetail?: "low" | "high" | "auto";
	fetch?: typeof fetch;
}

export interface PromptOptions<T extends z.ZodType = z.ZodType> {
	images?: string[];
	responseFormat?: T;
}

/** Injection token for the options object. */
export const OPENAI_OPTIONS = Symbol("OPENAI_OPTIONS");

const RESPONSE_FORMAT_NAME = "response";

@Injectable()
export class OpenAiService {
	private readonly logger = new Logger(OpenAiService.name);
	private readonly client: OpenAI;
	private readonly options: OpenAiServiceOptions;

	constructor(@Inject(OPENAI_OPTIONS) options: OpenAiServiceOptions) {
		this.client = new OpenAI({
			baseURL: options.baseUrl,
			apiKey: options.apiKey,
			timeout: options.timeoutMs ?? 120_000,
			maxRetries: options.maxRetries ?? 3,
			...(options.fetch ? { fetch: options.fetch } : {}),
		});
		this.options = options;
	}

	async prompt<T extends z.ZodType>(
		prompt: string,
		options: PromptOptions<T> & { responseFormat: T }
	): Promise<z.infer<T>>;
	async prompt(prompt: string, options?: PromptOptions): Promise<string>;
	async prompt<T extends z.ZodType>(prompt: string, options: PromptOptions<T> = {}): Promise<string | z.infer<T>> {
		const text = typeof prompt === "string" ? prompt.trim() : "";
		if (!text) throw new Error("Prompt cannot be empty.");

		let lastError: unknown;

		for (const model of this.options.models) {
			try {
				return await this.complete(model, text, options);
			} catch (error) {
				lastError = error;
				this.logger.warn(`Model ${model} failed, trying the next one: ${error}`);
			}
		}

		throw lastError;
	}

	private async complete<T extends z.ZodType>(
		model: string,
		text: string,
		options: PromptOptions<T>
	): Promise<string | z.infer<T>> {
		const schema = options.responseFormat;

		const completion = await this.client.chat.completions.create({
			model,
			temperature: 0,
			messages: [
				{
					role: "user",
					content: options.images?.length ? this.buildContent(text, options.images) : text,
				},
			],
			...(schema ? { response_format: zodResponseFormat(schema, RESPONSE_FORMAT_NAME) } : {}),
		});

		const content = completion.choices[0]?.message?.content;
		if (typeof content !== "string" || !content.trim()) {
			throw new Error("The provider returned no message content.");
		}

		if (!schema) return content;

		const parsed = schema.safeParse(this.parseJson(content));
		if (parsed.success) return parsed.data;

		const retry = await this.client.chat.completions.create({
			model,
			temperature: 0,
			messages: [
				{
					role: "user",
					content: options.images?.length
						? this.buildContent(this.withSchemaInstruction(text, schema), options.images)
						: this.withSchemaInstruction(text, schema),
				},
			],
		});

		const retryContent = retry.choices[0]?.message?.content;
		if (typeof retryContent !== "string" || !retryContent.trim()) {
			throw new Error("The provider returned no message content.");
		}

		const retried = schema.safeParse(this.parseJson(retryContent));
		if (!retried.success) {
			throw new Error(`The provider reply did not match the requested schema: ${retried.error.message}`);
		}

		return retried.data;
	}

	private withSchemaInstruction(text: string, schema: z.ZodType): string {
		const jsonSchema = z.toJSONSchema(schema, { io: "output" });

		return `${text}
			Reply with a single JSON value that conforms to this JSON Schema. Do not add any other keys, and use null for unknown values instead of omitting them.
			${JSON.stringify(jsonSchema)}`;
	}

	private buildContent(text: string, images: string[]) {
		return [
			{ type: "text" as const, text },
			...images.map((image) => ({
				type: "image_url" as const,
				image_url: { url: ImageUtil.toDataUri(image), detail: this.options.imageDetail },
			})),
		];
	}

	private parseJson(content: string): unknown {
		const text = content.trim();
		const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

		const candidates = [withoutFence];
		const start = withoutFence.indexOf("{");
		const end = withoutFence.lastIndexOf("}");
		if (start !== -1 && end > start) candidates.push(withoutFence.slice(start, end + 1));

		for (const candidate of candidates) {
			try {
				return JSON.parse(candidate);
			} catch {
				// try the next candidate
			}
		}

		return undefined;
	}
}
