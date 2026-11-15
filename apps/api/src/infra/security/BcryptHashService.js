import bcrypt from 'bcrypt';
import { HashService } from '../../application/ports/HashService.js';

const SALT_ROUNDS = 10;

export class BcryptHashService extends HashService {
  async hash(plain) {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async compare(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}
