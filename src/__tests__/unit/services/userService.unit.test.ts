import { createUserService } from 'features/user/userService';

import { mockUserRepo } from '__tests__/shared/mocks/repos';
import { mockCodeService } from '__tests__/shared/mocks/services';

import { buildPublicUser } from '__tests__/shared/factories';
import { buildUserInput, buildUser, buildUsers } from '__tests__/shared/factories';

import { PublicUser, User } from 'features/user/types';
import { CreateAccountInput } from 'features/auth/types';

import {
    prismaNotFoundError,
    prismaUniqueConstraintError,
} from '__tests__/shared/helpers/dbHelpers';
import { ConflictError } from 'shared/errors/errors';
let userInputData: CreateAccountInput;
let user: PublicUser;
let privateUser: User;
const userService = createUserService({ userRepo: mockUserRepo, codeService: mockCodeService });
describe('Unit tests: User service', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        userInputData = buildUserInput();
        user = buildPublicUser(userInputData);
        privateUser = buildUser(user);
    });

    describe('create', () => {
        test('Creates user and returns id', async () => {
            mockUserRepo.create.mockResolvedValueOnce(buildUser(user));
            mockUserRepo.findInternalUserByEmail.mockResolvedValueOnce(null);

            const { id } = await userService.create({ data: userInputData });
            expect(typeof id).toBe('string');
            expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: userInputData,
                }),
            );
        });
        test('Throws if email already exists', async () => {
            mockUserRepo.create.mockRejectedValue(prismaUniqueConstraintError);
            await expect(userService.create({ data: userInputData })).rejects.toThrow(
                'Value already in use',
            );
            expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('verify', () => {
        test('Verifies user', async () => {
            mockUserRepo.updateUserSensitive.mockResolvedValueOnce(privateUser);
            await userService.verify(user.id);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledWith({
                where: { id: user.id },
                data: { verified: true },
            });
        });
        test('Throws if user not found', async () => {
            mockUserRepo.updateUserSensitive.mockRejectedValue(prismaNotFoundError);
            await expect(userService.verify(user.id)).rejects.toThrow('User not found');
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
        });
        test('Throws if unexpected error occurs', async () => {
            mockUserRepo.updateUserSensitive.mockRejectedValue(new Error('Unexpected error'));
            await expect(userService.verify(user.id)).rejects.toThrow('Unexpected error');
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
        });
    });
    describe('update', () => {
        test('Updates user and returns data after updates applied', async () => {
            const username = 'newUserName';
            mockUserRepo.updateUserPublic.mockResolvedValueOnce({ ...user, username });
            const updatedUser = await userService.update({ id: user.id, data: { username } });
            expect(updatedUser).toEqual({ ...user, username });
            expect(mockUserRepo.updateUserPublic).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.updateUserPublic).toHaveBeenCalledWith({
                where: { id: user.id },
                data: { username },
            });
        });
        test('Throws if user not found', async () => {
            const username = 'newUserName';

            mockUserRepo.updateUserPublic.mockRejectedValue(prismaNotFoundError);
            await expect(userService.update({ id: user.id, data: { username } })).rejects.toThrow(
                'User not found',
            );
            expect(mockUserRepo.updateUserPublic).toHaveBeenCalledWith({
                where: { id: user.id },
                data: { username },
            });
        });
        test('Throws if username already exists', async () => {
            const username = 'newUserName';
            mockUserRepo.updateUserPublic.mockRejectedValue(prismaUniqueConstraintError);
            await expect(userService.update({ id: user.id, data: { username } })).rejects.toThrow(
                'Value already in use',
            );
            expect(mockUserRepo.updateUserPublic).toHaveBeenCalledWith({
                where: { id: user.id },
                data: { username },
            });
        });
    });
    describe('updatePassword', () => {
        test('Updates password and returns user', async () => {
            const password = 'passwordHash';
            mockUserRepo.updateUserSensitive.mockResolvedValueOnce(privateUser);
            const updatedUser = await userService.updatePassword({
                id: user.id,
                passwordHash: password,
            });
            expect(updatedUser).toEqual(privateUser);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledWith({
                where: { id: user.id },
                data: { password },
            });
        });
        test('Throws if user not found', async () => {
            const password = 'passwordHash';
            mockUserRepo.updateUserSensitive.mockRejectedValueOnce(prismaNotFoundError);
            await expect(
                userService.updatePassword({
                    id: user.id,
                    passwordHash: password,
                }),
            ).rejects.toThrow('User not found');
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledWith({
                where: { id: user.id },
                data: { password },
            });
        });
    });
    describe('update email', () => {
        test('Should successfully update user email', async () => {
            const newEmail = 'new@email.com';
            const fullUser = buildUser({ ...user, email: newEmail });
            mockUserRepo.updateUserSensitive.mockResolvedValue(fullUser);
            await userService.updateEmail({ id: user.id, email: fullUser.email });
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledWith({
                where: { id: user.id, verified: true },
                data: { email: fullUser.email, verified: false },
            });
        });
        test('Throws error if email is taken', async () => {
            mockUserRepo.updateUserSensitive.mockRejectedValue(prismaUniqueConstraintError);
            await expect(
                userService.updateEmail({ id: user.id, email: privateUser.email }),
            ).rejects.toThrow('Value already in use');
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledWith({
                where: { id: user.id, verified: true },
                data: { email: privateUser.email, verified: false },
            });
        });
        test('Throws error if user not found', async () => {
            mockUserRepo.updateUserSensitive.mockRejectedValue(prismaNotFoundError);
            await expect(
                userService.updateEmail({ id: user.id, email: privateUser.email }),
            ).rejects.toThrow('User not found');
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.updateUserSensitive).toHaveBeenCalledWith({
                where: { id: user.id, verified: true },
                data: { email: privateUser.email, verified: false },
            });
        });
    });
    describe('remove', () => {
        test('Removes user and returns their id', async () => {
            mockUserRepo.remove.mockResolvedValueOnce(user);
            const deletedId = await userService.remove(user.id);
            expect(deletedId).toEqual(user.id);
            expect(mockUserRepo.remove).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.remove).toHaveBeenCalledWith(user.id);
        });
        test('Throws if user not found', async () => {
            mockUserRepo.remove.mockRejectedValueOnce(prismaNotFoundError);
            await expect(userService.remove(user.id)).rejects.toThrow('User not found');
            expect(mockUserRepo.remove).toHaveBeenCalledWith(user.id);
        });
    });
    describe('findAuthUserById', () => {
        test('Finds user by id and returns their data', async () => {
            mockUserRepo.findUserPublicById.mockResolvedValueOnce(user);
            const returnedUser = await userService.findAuthUserById(user.id);
            expect(user).toEqual(returnedUser);
            expect(mockUserRepo.findUserPublicById).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.findUserPublicById).toHaveBeenCalledWith(
                expect.objectContaining({ id: user.id }),
            );
        });
        test('Throws if user not found', async () => {
            mockUserRepo.findUserPublicById.mockRejectedValueOnce(prismaNotFoundError);
            await expect(userService.findAuthUserById(user.id)).rejects.toThrow('User not found');
            expect(mockUserRepo.findUserPublicById).toHaveBeenCalledWith(
                expect.objectContaining({ id: user.id }),
            );
        });
    });
    describe('findInternalUserByEmail', () => {
        test('Finds user by email and returns their id', async () => {
            const privateUser = buildUser(userInputData);
            mockUserRepo.findInternalUserByEmail.mockResolvedValueOnce(privateUser);
            const returnedUser = await userService.findInternalUserByEmail({
                email: privateUser.email,
            });
            expect(returnedUser).toEqual(privateUser);
            expect(mockUserRepo.findInternalUserByEmail).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.findInternalUserByEmail).toHaveBeenCalledWith({
                email: privateUser.email,
            });
        });
        test('Throws if user not found', async () => {
            mockUserRepo.findInternalUserByEmail.mockResolvedValueOnce(null);
            await expect(
                userService.findInternalUserByEmail({ email: privateUser.email }),
            ).rejects.toThrow('User not found');
            expect(mockUserRepo.findInternalUserByEmail).toHaveBeenCalledWith({
                email: privateUser.email,
            });
        });
    });
    describe('findAll', () => {
        test('Returns all users', async () => {
            const users = buildUsers();
            const publicUsers = users.map((u) => buildPublicUser(u));
            mockUserRepo.findAll.mockResolvedValueOnce(publicUsers);
            const usersFromDb = await userService.findAll();
            expect(publicUsers.sort((a, b) => a.username.localeCompare(b.username))).toEqual(
                usersFromDb.sort((a, b) => a.username.localeCompare(b.username)),
            );
            expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
            expect(mockUserRepo.findAll).toHaveBeenCalledWith({ verified: true });
        });
        test('Returns empty array if no users', async () => {
            mockUserRepo.findAll.mockResolvedValueOnce([]);
            const retrievedUsers = await userService.findAll();
            expect(retrievedUsers).toEqual([]);
            expect(mockUserRepo.findAll).toHaveBeenCalledWith({ verified: true });
        });
    });

    describe('Update email', () => {
        const code = 'emailCode';
        test('Succesfully updates user email and issues new verification code', async () => {
            const email = 'new@email.com';
            mockCodeService.issueCodeForUser.mockResolvedValueOnce(code);

            await userService.updateEmail({ id: user.id, email });

            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(1);
        });
        test('Throws if user not found throws', async () => {
            const email = 'new@email.com';
            mockCodeService.issueCodeForUser.mockResolvedValueOnce(code);
            mockUserRepo.updateUserSensitive.mockRejectedValueOnce(
                new ConflictError('Email already in use'),
            );

            await expect(userService.updateEmail({ id: user.id, email })).rejects.toThrow(
                'Email already in use',
            );
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(0);
        });
    });
});
