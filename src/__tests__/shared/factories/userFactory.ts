import { randomUUID } from 'crypto';
import { PublicUser, User } from 'features/user/types';
import { CreateAccountInput } from 'features/auth/types';
import { faker } from '@faker-js/faker';

export const buildUserInput = (overrides: Partial<CreateAccountInput> = {}): CreateAccountInput => {
    const name = faker.name.firstName();

    let username = faker.internet.userName().replace(/[^a-zA-Z0-9._-]/g, '');
    if (username.length < 5) {
        username = username.padEnd(5, '0');
    }
    username = username.toLowerCase().slice(0, 30);

    const basePassword = faker.internet.password(8, false, /[A-Za-z0-9]/);
    const password = `${basePassword}Aa1!`;

    return {
        email: faker.internet.email(name).trim().toLowerCase(),
        username,
        password,
        ...overrides,
    };
};

export const buildUser = (overrides: Partial<User> = {}): User => {
    const userData = buildUserInput();
    return {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        verified: true,
        ...userData,
        ...overrides,
    };
};

export const buildPublicUser = (overrides: Partial<User> = {}): PublicUser => {
    const user = buildUser(overrides);
    const {
        password: _password,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        verified: _verified,
        email: _email,
        ...publicUser
    } = user;
    return publicUser;
};

export const buildUserInputs = (
    length = 3,
    overrides: Partial<CreateAccountInput>[] = [],
): CreateAccountInput[] => {
    return Array.from({ length }, (_, i) => buildUserInput(overrides[i] ?? {}));
};

export const buildUsers = (length = 3, overrides: Partial<User>[] = []): User[] => {
    return Array.from({ length }, (_, i) => buildUser(overrides[i] ?? {}));
};

export const buildPublicUsers = (length = 3, overrides: Partial<User>[] = []): PublicUser[] => {
    return Array.from({ length }, (_, i) => buildPublicUser(overrides[i] ?? {}));
};
