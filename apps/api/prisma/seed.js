/**
 * Dados de demonstração: um usuário de cada papel e alguns chamados do usuário comum.
 * Pode ser rodado várias vezes: usuários existentes (mesmo e-mail) não são duplicados
 * e os chamados de exemplo só são criados se o usuário comum ainda não tiver nenhum.
 *
 * Uso: npm run prisma:seed (na raiz do projeto)
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PASSWORD = '123456';

const USERS = [
  { name: 'Administrador', email: 'admin@techdiagnose.com', role: 'ADMIN' },
  { name: 'Técnico de Suporte', email: 'tecnico@techdiagnose.com', role: 'TECH' },
  { name: 'Usuário Comum', email: 'usuario@techdiagnose.com', role: 'USER' },
];

const SAMPLE_INCIDENTS = [
  {
    title: 'PC com vários problemas',
    equipment: 'Notebook Dell',
    description:
      'O notebook está lento, aquecendo e sem internet no wi-fi. Depois da atualização do Windows apareceu tela azul, o Excel dá erro ao abrir e surgiu um pop-up de vírus.',
  },
  {
    title: 'Sem acesso a sites',
    equipment: 'Desktop Positivo',
    description: 'Estou offline, o cabo está ligado mas o site não abre.',
  },
  {
    title: 'Arquivos bloqueados',
    equipment: 'Notebook Lenovo',
    description: 'Arquivo bloqueado, acesso negado e pop-up de vírus na tela.',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: passwordHash },
    });
    console.log(`Usuário ${user.role.padEnd(5)} ${user.email} (senha: ${PASSWORD})`);
  }

  const commonUser = await prisma.user.findUnique({ where: { email: 'usuario@techdiagnose.com' } });
  const existing = await prisma.incident.count({ where: { userId: commonUser.id } });
  if (existing === 0) {
    for (const incident of SAMPLE_INCIDENTS) {
      await prisma.incident.create({ data: { ...incident, userId: commonUser.id } });
    }
    console.log(`${SAMPLE_INCIDENTS.length} chamados de exemplo criados para ${commonUser.email}`);
  } else {
    console.log(`${commonUser.email} já possui chamados; nenhum exemplo foi criado`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
