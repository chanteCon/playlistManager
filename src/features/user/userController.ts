import { Request, Response } from 'express';
import { UserUpdatableInput } from './types';
import { UserService } from './userService';
import { AuthRequest } from 'features/auth/types';
import { canSendResponse } from 'shared/helper';

export type UserController = ReturnType<typeof createUserController>;

export const createUserController = (userService: UserService) => {
    const getUserById = async (req: Request<{ id: string }>, res: Response) => {
        const user = await userService.findVerifiedById(req.params.id);
        return res.status(200).json({ user });
    };

    const getAuthenticatedUser = async (req: AuthRequest, res: Response) => {
        const user = await userService.findAuthUserById(req.user!.id);
        return res.status(200).json({ user });
    };

    const getAllUsers = async (_req: Request, res: Response) => {
        const users = await userService.findAll();
        return res.status(200).json({ users });
    };

    const updateAuthenticatedUser = async (
        req: AuthRequest<any, any, UserUpdatableInput>,
        res: Response,
    ) => {
        const { id, data } = { id: req.user!.id, data: req.body };
        const user = await userService.update({ id, data });
        return res.status(200).json({ user });
    };

    const deleteAuthenticatedUser = async (req: AuthRequest, res: Response) => {
        await userService.remove(req.user!.id);
        if (canSendResponse(res)) {
            return res.status(204).send();
        }
    };

    const updateEmail = async (req: AuthRequest<any, any, { email: string }>, res: Response) => {
        const data = { id: req.user!.id, email: req.body.email };

        await userService.updateEmail(data);
        res.locals.message = 'A verification code has been sent, please check email';
        return res.status(200).json({});
    };

    return {
        updateAuthenticatedUser,
        deleteAuthenticatedUser,
        getUserById,
        getAllUsers,
        getAuthenticatedUser,
        updateEmail,
    };
};
