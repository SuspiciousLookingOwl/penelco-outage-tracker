/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from "@nestjs/common";
import { type ZodType } from "zod";

export type MethodDecorator<T = any> = (
	target: unknown,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

export const ValidateParams = (...schemas: (ZodType | null)[]): MethodDecorator<(...args: any[]) => any> => {
	return (t, p, descriptor) => {
		const method = descriptor.value;

		descriptor.value = function (this: any, ...args: unknown[]) {
			const validatedArgs: unknown[] = [];
			for (const [i, schema] of schemas.entries()) {
				if (!schema) {
					validatedArgs.push(args[i]);
					continue;
				}
				const result = schema.safeParse(args[i]);
				if (!result.success) throw new BadRequestException(result.error.message);
				validatedArgs.push(result.data);
			}
			return method?.call(this, ...validatedArgs);
		} as any;

		return descriptor;
	};
};
