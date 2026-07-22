import { z } from 'zod';

type SchemaTestConfig = {
    schema: z.ZodTypeAny;
    validInput: Record<string, any>;
    required: { field: string; badValue: any }[];
    extraFieldKey: string;
};

export const testZodSchema = (config: SchemaTestConfig) => {
    const { schema, validInput, required, extraFieldKey } = config;
    describe(`${schema.type} schema tests`, () => {
        test('Valid input passes', () => {
            const res = schema.safeParse(validInput);
            expect(res.success).toBe(true);
            expect(res.data).toEqual(validInput);
        });
        required.forEach(({ field }) => {
            test(`Missing ${field}`, () => {
                const input = { ...validInput };
                delete input[field];
                const res = schema.safeParse(input);
                expect(res.success).toBe(false);
                expect(res.error).toBeDefined();
            });
        });
        required.forEach(({ field, badValue }) => {
            test(`Incorrect type for ${field}`, () => {
                const input = { ...validInput };
                input[field] = badValue;
                const res = schema.safeParse(input);
                expect(res.success).toBe(false);
                expect(res.error).toBeDefined();
            });
        });
        test('Removes extra field', () => {
            const input = { ...validInput, [extraFieldKey]: 'extra value' };
            const res = schema.safeParse(input);
            expect(res.success).toBe(true);
            expect(res.data).toBeDefined();
            expect(res.data).toEqual(validInput);
        });
    });
};
