import { mockEmailService } from '__tests__/shared/mocks/services';
import { buildUserInput, buildUserInputs } from '__tests__/shared/factories';
import { CreateAccountInput } from 'features/auth/types';
import { randomUUID } from 'crypto';
import { createUserServiceFixture } from '__tests__/setup/integration';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedUser } from '__tests__/shared/seeds/seeds';
import { UserService } from 'features/user/userService';
import { createTestInfrastructure, InfraStructure } from '__tests__/setup/infrastructure';

let testEnv: InfraStructure & {
    userService: UserService;
};

beforeAll(async () => {
    const infra = await createTestInfrastructure();
    const { userService } = await createUserServiceFixture({
        ...infra,
        emailService: mockEmailService,
    });
    testEnv = { ...infra, userService };
});

afterAll(async () => {
    await testEnv.teardown();
});
describe('Integration tests: User service', () => {
    let userInputData: CreateAccountInput;

    beforeEach(async () => {
        jest.clearAllMocks();
        userInputData = buildUserInput();
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
    });

    describe('Create', () => {
        test('Successfully inserts user into database', async () => {
            const { id } = await testEnv.userService.create({ data: userInputData });

            const dbUser = await testEnv.db.user.findUnique({ where: { id } });

            expect(dbUser).not.toBeNull();

            expect(dbUser!.email).toEqual(userInputData.email);
            expect(dbUser!.password).toEqual(userInputData.password);
            expect(dbUser!.username).toEqual(userInputData.username);
            expect(dbUser!.createdAt).toBeDefined();
        });
        test('Does not add user if email is taken', async () => {
            const { id: id1 } = await testEnv.userService.create({ data: userInputData });
            expect(id1).toBeDefined();

            const userInputData2 = buildUserInput({ email: userInputData.email });

            await expect(testEnv.userService.create({ data: userInputData2 })).rejects.toThrow(
                'Email already in use',
            );

            const users = await testEnv.db.user.findMany();
            expect(users).toHaveLength(1);
            expect(users[0].id).toEqual(id1);
        });
        test('Does not add user if username is taken', async () => {
            const { id: id1 } = await testEnv.userService.create({ data: userInputData });
            expect(id1).toBeDefined();

            const userInputData2 = buildUserInput({ username: userInputData.username });

            await expect(testEnv.userService.create({ data: userInputData2 })).rejects.toThrow(
                'Username already in use',
            );

            const users = await testEnv.db.user.findMany();
            expect(users).toHaveLength(1);
            expect(users[0].id).toEqual(id1);
        });
    });

    describe('Update', () => {
        test('Successful updates user data in the testEnv.db', async () => {
            const { id } = await testEnv.userService.create({ data: userInputData });
            await testEnv.userService.update({ id, data: { username: 'newUsername' } });

            const dbUser = await testEnv.db.user.findUnique({ where: { id } });
            expect(dbUser!.username).toEqual('newUsername');
        });
        test('Throws if user id not in testEnv.db', async () => {
            await expect(
                testEnv.userService.update({
                    id: randomUUID(),
                    data: { username: 'username' },
                }),
            ).rejects.toThrow('User not found');
        });
    });

    describe('Remove', () => {
        test('Should successfully remove user from testEnv.db', async () => {
            const { id } = await testEnv.userService.create({ data: userInputData });
            await testEnv.userService.remove(id);

            const users = await testEnv.db.user.findMany();
            expect(users).toHaveLength(0);
        });
        test('Throws if user id not not testEnv.db', async () => {
            await expect(testEnv.userService.remove(randomUUID())).rejects.toThrow(
                'User not found',
            );
        });
    });

    describe('Find by id', () => {
        test('Successfully retrieves user from testEnv.db', async () => {
            const { id } = await testEnv.userService.create({ data: userInputData });
            const user = await testEnv.userService.findAuthUserById(id);

            const dbUser = await testEnv.db.user.findUnique({ where: { id } });
            expect(dbUser!.username).toEqual(user.username);
        });
        test('Throws if user id not in testEnv.db', async () => {
            await expect(testEnv.userService.findAuthUserById(randomUUID())).rejects.toThrow(
                'User not found',
            );
        });
    });

    describe('Find by email', () => {
        test('Succesfully retrieves user from testEnv.db', async () => {
            const email = userInputData.email;
            await testEnv.userService.create({ data: userInputData });
            const user = await testEnv.userService.findInternalUserByEmail({ email });

            const dbUser = await testEnv.db.user.findUnique({ where: { email } });
            expect(dbUser!.id).toEqual(user.id);
        });
        test('Throws if user id not in testEnv.db', async () => {
            await expect(
                testEnv.userService.findInternalUserByEmail({
                    email: 'bademail.com.au',
                }),
            ).rejects.toThrow('User not found');
        });
    });

    describe('Find all', () => {
        test('Successfully returns all users in testEnv.db', async () => {
            const usersData = buildUserInputs();
            await Promise.all(usersData.map((data) => testEnv.userService.create({ data })));

            const users = await testEnv.userService.findAll({ verified: false });

            const dbUsers = await testEnv.db.user.findMany();
            expect(dbUsers).toHaveLength(users.length);
            expect(dbUsers.map((u) => u.username).sort()).toEqual(
                users.map((u) => u.username).sort(),
            );
        });
        test('Returns empty array if no users in testEnv.db', async () => {
            const users = await testEnv.userService.findAll({ verified: false });

            const dbUsers = await testEnv.db.user.findMany();
            expect(dbUsers).toEqual(users);
        });
    });

    describe('Update password', () => {
        test('Successfully updates the password in the testEnv.db', async () => {
            const { id } = await testEnv.userService.create({ data: userInputData });
            const passwordHash = 'hashedPassword';

            await testEnv.userService.updatePassword({ id, passwordHash });

            const dbUser = await testEnv.db.user.findUnique({ where: { id } });
            expect(dbUser!.password).toEqual(passwordHash);
        });

        test('Throws if user id not in testEnv.db', async () => {
            await expect(
                testEnv.userService.updatePassword({
                    id: randomUUID(),
                    passwordHash: 'passwordHash',
                }),
            ).rejects.toThrow('User not found');
        });
    });

    describe('Update email', () => {
        test('Successfully udpates the user email in the testEnv.db and unverifies them in testEnv.db, and adds verification code', async () => {
            const email = 'new@email.com';
            const { id } = await testEnv.userService.create({ data: userInputData });
            await testEnv.db.user.update({ where: { id }, data: { verified: true } });
            await testEnv.userService.updateEmail({
                id,
                email,
            });

            const dbUser = await testEnv.db.user.findUnique({ where: { id } });
            expect(dbUser!.email).toEqual(email);
            expect(dbUser!.verified).toBe(false);

            const cachedCode = await testEnv.redis.get(`user-code:${dbUser!.id}:${'VERIFICATION'}`);
            expect(cachedCode).not.toBeNull();

            expect(mockEmailService.sendCodeEmail).toHaveBeenCalledTimes(1);
        });

        test('Throws if user is not found', async () => {
            const email = 'new@email.com';
            const { id } = await testEnv.userService.create({ data: userInputData });
            await testEnv.db.user.update({ where: { id }, data: { verified: false } });
            await expect(
                testEnv.userService.updateEmail({
                    id,
                    email,
                }),
            ).rejects.toThrow('User not found');
        });
        test('Throws if email is taken', async () => {
            const { id } = await testEnv.userService.create({ data: userInputData });
            const user2 = await seedUser(testEnv.db);
            await testEnv.db.user.update({ where: { id }, data: { verified: true } });
            await expect(
                testEnv.userService.updateEmail({
                    id,
                    email: user2.email,
                }),
            ).rejects.toThrow('Email already in use');

            expect(mockEmailService.sendCodeEmail).toHaveBeenCalledTimes(0);
        });
    });
});
