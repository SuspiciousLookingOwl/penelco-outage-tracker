import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { AppConfigService } from "../config/app-config.service";

@Injectable()
export class BasicAuthGuard implements CanActivate {
	constructor(private readonly config: AppConfigService) {}

	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();

		const credentials = this.parse(request.headers.authorization);
		const { username, password } = this.config.basicAuth;

		if (
			credentials &&
			this.matches(credentials.username, username) &&
			this.matches(credentials.password, password)
		) {
			return true;
		}

		response.setHeader("WWW-Authenticate", 'Basic realm="penelco", charset="UTF-8"');
		throw new UnauthorizedException("Invalid credentials.");
	}

	private parse(header: string | undefined): { username: string; password: string } | null {
		if (!header?.startsWith("Basic ")) return null;

		const decoded = Buffer.from(header.slice("Basic ".length).trim(), "base64").toString("utf8");
		const separator = decoded.indexOf(":");
		if (separator === -1) return null;

		return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
	}

	private matches(actual: string, expected: string): boolean {
		const a = Buffer.from(actual);
		const b = Buffer.from(expected);

		return a.length === b.length && timingSafeEqual(a, b);
	}
}
