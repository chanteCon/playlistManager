import { randomUUID } from 'crypto';
import { updateUserSchema, userIdSchema } from 'features/user/schemas';
import { buildUserInput } from '__tests__/shared/factories';
import { testZodSchema } from '__tests__/unit/schemas/testZodSchema';

describe('Unit tests: User Schemas', () => {
    const userInputData = buildUserInput();
    describe('Update user schema', () => {
        const config = {
            schema: updateUserSchema,
            validInput: { username: userInputData.username },
            fields: [{ field: 'username', badValue: 4.0 }],
            required: ['username'],
            extraFieldKey: 'password',
        };
        testZodSchema(config);
    });
    describe('User id schema', () => {
        const config = {
            schema: userIdSchema,
            validInput: { id: randomUUID() },
            fields: [{ field: 'id', badValue: 4.0 }],
            required: ['id'],
            extraFieldKey: 'password',
        };
        testZodSchema(config);
    });
});
