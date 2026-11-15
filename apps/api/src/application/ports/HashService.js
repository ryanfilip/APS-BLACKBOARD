/** Porta (interface abstrata) para hash de senhas. */
export class HashService {
  // eslint-disable-next-line no-unused-vars
  async hash(plain) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async compare(plain, hash) {
    throw new Error('Not implemented');
  }
}
