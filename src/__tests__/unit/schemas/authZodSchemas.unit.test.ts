import {
    createAccountSchema,
    loginSchema,
    codeReqSchema,
    passwordResetSchema,
} from 'features/auth/schemas';
import { updateEmailSchema } from 'features/user/schemas';
import { buildUserInput } from '__tests__/shared/factories';
import { testZodSchema } from '__tests__/unit/schemas/testZodSchema';

describe('Unit tests: Auth Schemas', () => {
    const userInputData = buildUserInput();
    describe('Create account schema', () => {
        const config = {
            schema: createAccountSchema,
            validInput: userInputData,
            required: [
                { field: 'email', badValue: 2 },
                { field: 'username', badValue: 4.0 },
                { field: 'password', badValue: 7 },
            ],
            extraFieldKey: 'id',
        };
        testZodSchema(config);
    });
    describe('Login schema', () => {
        const { email, password } = userInputData;
        const config = {
            schema: loginSchema,
            validInput: { email, password },
            required: [
                { field: 'email', badValue: 2 },
                { field: 'password', badValue: 7 },
            ],
            extraFieldKey: 'id',
        };
        testZodSchema(config);
    });
    describe('Password resest request schema', () => {
        const { email } = userInputData;
        const config = {
            schema: codeReqSchema,
            validInput: { email },
            required: [{ field: 'email', badValue: 2 }],
            extraFieldKey: 'id',
        };
        testZodSchema(config);
    });
    describe('Password reset schema', () => {
        const { password } = userInputData;
        const config = {
            schema: passwordResetSchema,
            validInput: { password, code: '123456' },
            required: [
                { field: 'code', badValue: 2 },
                { field: 'password', badValue: 3 },
            ],
            extraFieldKey: 'id',
        };
        testZodSchema(config);
    });
    describe('Update email schema', () => {
        const { email } = userInputData;
        const config = {
            schema: updateEmailSchema,
            validInput: { email },
            required: [{ field: 'email', badValue: 2 }],
            extraFieldKey: 'id',
        };
        testZodSchema(config);
    });
});
