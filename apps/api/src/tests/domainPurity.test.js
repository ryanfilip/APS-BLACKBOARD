import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const domainDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'domain');

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'tests' ? [] : listSourceFiles(path);
    return path.endsWith('.js') ? [path] : [];
  });
}

// A camada de domínio não pode depender de frameworks nem de camadas externas.
const FORBIDDEN_IMPORT =
  /from\s+['"](?:express|cors|dotenv|zod|bcrypt|jsonwebtoken|prisma|@prisma\/[^'"]+)['"]|from\s+['"](?:\.\.\/)+(?:application|infra|interfaces|config)\//;

describe('pureza da camada domain', () => {
  const files = listSourceFiles(domainDir);

  it('encontra os arquivos do domínio', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((file) => [file.slice(domainDir.length + 1), file]))(
    '%s não importa frameworks nem outras camadas',
    (_name, file) => {
      expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN_IMPORT);
    },
  );
});
