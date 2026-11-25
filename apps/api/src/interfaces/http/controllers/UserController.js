import { handleDomainError } from '../middlewares/handleDomainError.js';
import { changeRoleSchema } from '../validators/userValidators.js';

/** Controller fino das rotas de administração de usuários (somente ADMIN). */
export class UserController {
  constructor({ listUsers, changeUserRole }) {
    this.listUsers = listUsers;
    this.changeUserRole = changeUserRole;
  }

  list = async (req, res, next) => {
    try {
      return res.status(200).json(await this.listUsers.execute());
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  changeRole = async (req, res, next) => {
    try {
      const { role } = changeRoleSchema.parse(req.body ?? {});
      const result = await this.changeUserRole.execute({
        targetUserId: req.params.id,
        role,
        adminId: req.user.id,
      });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };
}
