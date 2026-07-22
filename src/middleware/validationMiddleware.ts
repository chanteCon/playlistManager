import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'shared/errors/errors';
import { z, ZodError } from 'zod';

export const validate = <T extends z.ZodType>(
    schema: T,
    property: 'body' | 'params' | 'query' = 'body',
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[property]);
        if (!result.success) {
            throw new ValidationError('Invalid Input', formatZodError(result.error));
        }
        req[property] = result.data as z.infer<T>;
        next();
    };
};

const formatZodError = (error: ZodError) => {
    const formatted: Record<string, string[]> = {};
    const errorTree = z.treeifyError(error) as {
        errors: string[];
        properties: Record<string, { errors: string[] }>;
    };
    const properties = errorTree.properties;
    for (const key in properties) {
        if (properties[key].errors && properties[key].errors.length > 0) {
            formatted[key] = properties[key].errors;
        }
    }
    return formatted;
};
