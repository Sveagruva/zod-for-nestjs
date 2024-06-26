import {
    ArgumentMetadata,
    BadRequestException,
    Paramtype,
    PipeTransform,
    UsePipes,
} from "@nestjs/common";
import { z, ZodSchema } from "zod";
import { ApiBody, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { generateSchema } from "@anatine/zod-openapi";
import { fromZodError } from "zod-validation-error";

const generateOpenAPISchema = (schema: ZodSchema) => {
    const sch = generateSchema(schema);

    if (sch.properties === undefined) {
        return sch;
    }

    if(sch.required === undefined) {
        sch.required = [];
    }

    for (const key of Object.keys(sch.properties)) {
        if(sch.required.includes(key)) {
            continue;
        }

        // @ts-ignore
        const isZodOptional = schema.shape[key].isOptional() || schema.shape[key].isNullable();
        if(!isZodOptional) {
            sch.required.push(key);
        }
    }

    return sch;
}

const ValidationApiResponse = {
    status: 400,
    schema: generateOpenAPISchema(z.object({
        error: z.string(),
        message: z.string(),
        statusCode: z.number(),
    }))
};

class ZodValidationPipe implements PipeTransform {
    constructor(
        private schema: ZodSchema,
        private forType: Paramtype = "body",
    ) {}

    static body(schema: ZodSchema) {
        return new ZodValidationPipe(schema, "body");
    }

    static query(schema: ZodSchema) {
        return new ZodValidationPipe(schema, "query");
    }

    static param(schema: ZodSchema) {
        return new ZodValidationPipe(schema, "param");
    }

    transform(value: unknown, metadata: ArgumentMetadata) {
        if (metadata.type !== this.forType) {
            return value;
        }

        try {
            return this.schema.parse(value);
        } catch (error: any) {
            const validationError = fromZodError(error);
            throw new BadRequestException(validationError.toString());
        }
    }
}

export function ZBody(schema: ZodSchema): MethodDecorator {
    return function (
        target: any,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ) {
        UsePipes(ZodValidationPipe.body(schema))(target, propertyKey, descriptor);
        ApiResponse(ValidationApiResponse)(target, propertyKey, descriptor);
        ApiBody({
            // @ts-expect-error should be fine
            schema: generateOpenAPISchema(schema),
        })(target, propertyKey, descriptor);
    };
}

export function ZQuery(schema: ZodSchema): MethodDecorator {
    return function (
        target: any,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ) {
        UsePipes(ZodValidationPipe.query(schema))(target, propertyKey, descriptor);
        ApiResponse(ValidationApiResponse)(target, propertyKey, descriptor);

        const obj = generateOpenAPISchema(schema) as any;
        if (obj.properties === undefined) {
            return;
        }

        for (const property of Object.keys(obj.properties)) {
            ApiQuery({
                name: property,
                ...obj.properties[property],
                required: obj.required.includes(property),
            })(target, propertyKey, descriptor);
        }
    };
}

export function ZParam(schema: ZodSchema): MethodDecorator {
    return function (
        target: any,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ) {
        UsePipes(ZodValidationPipe.param(schema))(target, propertyKey, descriptor);
        ApiResponse(ValidationApiResponse)(target, propertyKey, descriptor);

        const obj = generateOpenAPISchema(schema) as any;
        if (obj.properties === undefined) {
            return;
        }

        for (const property of Object.keys(obj.properties)) {
            ApiParam({
                name: property,
                ...obj.properties[property],
                required: obj.required.includes(property),
            })(target, propertyKey, descriptor);
        }
    };
}

export function ZReturn(schema: ZodSchema, status = 200): MethodDecorator {
    return function (
        target: any,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const result = originalMethod.apply(this, args);

            if (result instanceof Promise) {
                return result.then((data) => {
                    try {
                        return schema.parse(data);
                    } catch (error) {
                        throw new BadRequestException("Validation failed");
                    }
                });
            }

            try {
                return schema.parse(result);
            } catch (error) {
                throw new BadRequestException("Validation failed");
            }
        };

        ApiResponse({
            status: status,
            // @ts-expect-error should be fine
            schema: generateOpenAPISchema(schema),
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}
