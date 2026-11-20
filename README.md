# TechDiagnose

Sistema de diagnóstico de problemas de TI construído sobre o padrão arquitetural **Blackboard (Quadro-Negro)**.
Projeto acadêmico da disciplina de Arquitetura e Padrões de Software (CEFET/RJ).

> **Estado atual:** Blocos 1 a 7 do plano original concluídos. O usuário se cadastra, relata um problema,
> executa o diagnóstico e vê as hipóteses ordenadas por confiança, cada uma com suas evidências.
> Veja [Onde estamos](#13-onde-estamos) e [O que falta implementar](#14-o-que-falta-implementar).

Este documento foi escrito para quem está chegando agora no projeto. Se você só quer rodar tudo, vá direto para
[Primeiros passos](#5-primeiros-passos-do-zero-ao-projeto-rodando). Se quer entender as ideias antes de mexer no código,
leia na ordem: seções 1, 2 e 3.

## Índice

1. [A ideia do projeto](#1-a-ideia-do-projeto)
2. [O padrão Blackboard em 5 minutos](#2-o-padrão-blackboard-em-5-minutos)
3. [Exemplo completo de um diagnóstico](#3-exemplo-completo-de-um-diagnóstico)
4. [Stack e requisitos](#4-stack-e-requisitos)
5. [Primeiros passos (do zero ao projeto rodando)](#5-primeiros-passos-do-zero-ao-projeto-rodando)
6. [Estrutura do repositório](#6-estrutura-do-repositório)
7. [Arquitetura em camadas (e as regras para não quebrá-la)](#7-arquitetura-em-camadas-e-as-regras-para-não-quebrá-la)
8. [Como uma requisição percorre o sistema](#8-como-uma-requisição-percorre-o-sistema)
9. [API HTTP](#9-api-http)
10. [Banco de dados](#10-banco-de-dados)
11. [Frontend](#11-frontend)
12. [Testes](#12-testes)
13. [Onde estamos](#13-onde-estamos)
14. [O que falta implementar](#14-o-que-falta-implementar)
15. [Guias práticos (receitas)](#15-guias-práticos-receitas)
16. [Convenções do projeto](#16-convenções-do-projeto)
17. [Armadilhas conhecidas](#17-armadilhas-conhecidas)
18. [Solução de problemas](#18-solução-de-problemas)
19. [Glossário](#19-glossário)
20. [Referências](#20-referências)


---

## 1. A ideia do projeto

Imagine o balcão de suporte de uma empresa. Alguém chega e diz: *"meu computador está lento e estou sem internet"*.
Um bom time de suporte não responde com uma única pessoa: o técnico de hardware pensa em memória e disco, o de rede
pensa em DNS e placa de rede, e cada um aponta suspeitas e o que o levou a suspeitar.

O **TechDiagnose** simula isso:

1. O usuário **relata um incidente** com três informações: título, descrição e equipamento.
2. Um conjunto de **especialistas de software** (as Knowledge Sources) analisa o relato.
3. Cada especialista levanta **hipóteses de causa** ("Possível falha ou sobrecarga na memória RAM"),
   com um **nível de confiança** (50 a 90%) e **evidências** ("Sintoma 'lento' relatado").
4. O sistema mostra o resultado: hipóteses ordenadas da mais para a menos provável.

### O que este projeto é (e o que não é)

- **É** uma demonstração prática e fiel do padrão Blackboard, com arquitetura em camadas e bastante teste automatizado.
- **Não é** um sistema de IA. As regras dos especialistas são **palavras-chave simples** de propósito: o objetivo
  acadêmico é a arquitetura (quem conversa com quem, quem decide o quê), não a sofisticação do diagnóstico.
  Melhorar as regras é bem-vindo, mas sem quebrar a arquitetura (veja [Convenções](#16-convenções-do-projeto)).

### Quem usa

| Papel | Situação hoje |
|---|---|
| `USER` | Cadastra-se, relata incidentes, executa e vê diagnósticos **dos próprios incidentes**. É o único papel criado pelo cadastro. |
| `TECH` e `ADMIN` | Existem no banco e no token JWT, mas **ainda não têm funcionalidades exclusivas** (veja [O que falta](#14-o-que-falta-implementar)). |

Regra de segurança importante: **um usuário nunca vê nem executa nada sobre incidentes de outro usuário.**

---

## 2. O padrão Blackboard em 5 minutos

### A analogia

Uma sala com vários especialistas em volta de um **quadro-negro**. Cada um olha o quadro e, quando vê algo que sabe
analisar, escreve ali sua contribuição. **Ninguém conversa diretamente com ninguém**: toda comunicação acontece
escrevendo e lendo o quadro. Um **coordenador** escolhe quem fala a cada rodada e encerra quando ninguém tem mais
nada a acrescentar.

### Os três componentes e onde estão no código

| Componente | Papel | Arquivo |
|---|---|---|
| **Blackboard** (o quadro) | Guarda o estado do diagnóstico **em memória**: o incidente, fatos, hipóteses e evidências. | `apps/api/src/domain/blackboard/Blackboard.js` |
| **Knowledge Sources** (KS, os especialistas) | Cada uma lê o quadro e, se tiver o que dizer, adiciona hipóteses e evidências. | `apps/api/src/domain/knowledge-sources/KS1_Hardware/` ... `KS5_Security/` |
| **Control Component** (o coordenador) | Pergunta a cada KS "você pode agir?", escolhe uma, manda executar e repete. | `apps/api/src/domain/control/ControlComponent.js` |

```text
                  +--------------------------------------------+
                  |             Control Component              |
                  |  repete: 1) quem pode executar?            |
                  |          2) executa UMA (menor índice)     |
                  |  para quando ninguém pode (ou no limite)   |
                  +---------+---------------------^------------+
                            | execute(bb)         | canExecute(bb)
                  +---------v---------------------+------------+
                  |  KS1 Hardware   KS2 Network   KS3 SO       |
                  |  KS4 Software   KS5 Security               |
                  +---------+----------------------------------+
                            |  lê e escreve (única forma de comunicação)
                  +---------v----------------------------------+
                  |        Blackboard (objeto em memória)      |
                  |  incident | facts | hypotheses | evidences |
                  +--------------------------------------------+
```

### O que fica escrito no quadro

| Entidade | Campos | Significado |
|---|---|---|
| **Fact** (fato) | `id`, `description`, `createdAt` | Informação objetiva. O primeiro fato é sempre o incidente relatado. |
| **Hypothesis** (hipótese) | `id`, `description`, `source`, `confidence` (0 a 100), `status` (`OPEN`, `CONFIRMED`, `REJECTED`) | Uma suspeita de causa. `source` é a KS que a gerou (ex.: `KS1_Hardware`). |
| **Evidence** (evidência) | `id`, `description`, `supports` (id da hipótese), `polarity` (`SUPPORTS` ou `REFUTES`), `source` | O que justifica a hipótese (apoia) ou a enfraquece (refuta). |

### As regras de ouro (não as quebre)

1. **KS nunca chamam outras KS.** Só leem e escrevem no Blackboard.
2. **O Control Component não sabe nada de TI.** Nada de `if (sintoma === 'travando')`. Ele só chama `canExecute()` e
   `execute()`. Um teste automatizado falha se uma palavra-chave de TI aparecer no código dele.
3. **O Blackboard é memória.** Uma instância nova por diagnóstico. Só vai ao banco no final, como JSON
   (`Blackboard.getState()` → coluna `Diagnosis.state`).
4. **Toda KS precisa parar de poder executar depois de rodar** (`canExecute` vira `false` quando as hipóteses dela já
   estão no quadro). Sem isso o loop não termina; por segurança o Control corta em `maxIterations` (padrão 10).

---

## 3. Exemplo completo de um diagnóstico

Incidente relatado:

| Título | Descrição | Equipamento |
|---|---|---|
| Computador com problemas | Computador lento e sem internet | Desktop Dell |

O que acontece por dentro (a análise usa só `description` + `equipment`, **sem o título**):

| Iteração | Quem pode executar? | Escolhida | O que ela escreve no quadro |
|---|---|---|---|
| 1 | KS1 (palavra "lento") e KS2 (palavra "internet") | **KS1_Hardware** (menor índice) | Hipóteses "Possível falha ou sobrecarga na memória RAM" e "Disco rígido com setores defeituosos", cada uma com a evidência `Sintoma 'lento' relatado` |
| 2 | Só a KS2 (a KS1 já escreveu o que tinha) | **KS2_Network** | Hipóteses "Perda de pacotes na rede" e "Falha na placa de rede ou driver", cada uma com a evidência `Sintoma 'internet' relatado` |
| 3 | Ninguém | (fim) | Resultado: `iterations = 2`, `finishedBy = "NO_MORE_ACTIONS"` |

Resultado final (a tela de diagnóstico mostra as hipóteses ordenadas por confiança):

| Hipótese | Origem | Confiança | Evidência |
|---|---|---|---|
| Possível falha ou sobrecarga na memória RAM | KS1_Hardware | 50% | Sintoma 'lento' relatado |
| Disco rígido com setores defeituosos | KS1_Hardware | 50% | Sintoma 'lento' relatado |
| Perda de pacotes na rede | KS2_Network | 50% | Sintoma 'internet' relatado |
| Falha na placa de rede ou driver | KS2_Network | 50% | Sintoma 'internet' relatado |

**Como a confiança é calculada hoje:** 50% com uma palavra-chave encontrada, **+10% para cada palavra a mais**,
limitado a 90%. Por isso o exemplo acima ficou todo em 50%. Já "Tela azul toda vez que ligo o Windows, depois da
atualização" gera, só na KS3, "Driver desatualizado" com 70% (casou "tela azul", "atualização" e "windows") e as outras
duas hipóteses com 60%.

Formato salvo no banco (`Diagnosis.state`, resultado de `Blackboard.getState()`), abreviado:

```json
{
  "incident": { "title": "Computador com problemas", "description": "Computador lento e sem internet", "equipment": "Desktop Dell" },
  "facts": [
    { "id": "…", "description": "Incidente relatado — Título: Computador com problemas | Equipamento: Desktop Dell | Descrição: Computador lento e sem internet", "createdAt": "2026-11-20T10:00:00.000Z" }
  ],
  "hypotheses": [
    { "id": "h-1", "description": "Possível falha ou sobrecarga na memória RAM", "source": "KS1_Hardware", "confidence": 50, "status": "OPEN" }
  ],
  "evidences": [
    { "id": "…", "description": "Sintoma 'lento' relatado", "supports": "h-1", "polarity": "SUPPORTS", "source": "KS1_Hardware" }
  ]
}
```

Quer brincar com isso sem subir banco nem servidor? Veja o [playground](#155-experimentar-o-motor-sem-banco-nem-servidor).

---

## 4. Stack e requisitos

| Parte | Tecnologias |
|---|---|
| Monorepo | npm workspaces (`apps/*`) |
| Backend (`apps/api`) | Node.js, Express 4, JavaScript (ESM, **sem TypeScript**), Prisma 5, PostgreSQL, Zod, bcrypt, jsonwebtoken |
| Frontend (`apps/web`) | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios (JSX, **sem TypeScript**) |
| Testes | Vitest nos dois apps; Supertest (HTTP) na API; Testing Library + jsdom no web |

**Você precisa ter instalado:**

| Ferramenta | Versão | Conferir com |
|---|---|---|
| Node.js | 18 ou superior (recomendado 20 LTS) | `node -v` |
| npm | 9 ou superior (vem com o Node) | `npm -v` |
| PostgreSQL | 14 ou superior (local **ou** via Docker) | `docker --version` ou `psql --version` |
| Git | qualquer versão recente | `git --version` |

---

## 5. Primeiros passos (do zero ao projeto rodando)

Tempo estimado: 10 a 15 minutos. Os comandos abaixo são para Linux/macOS; as diferenças para Windows estão indicadas.

### 5.1 Obter o código e instalar as dependências

```bash
git clone <URL-DO-REPOSITORIO> techdiagnose     # ou extraia o .zip recebido
cd techdiagnose
npm install                                     # instala API e web de uma vez (workspaces)
```

> O `bcrypt` usa um módulo nativo. Se a instalação falhar, veja [Solução de problemas](#18-solução-de-problemas).

### 5.2 Subir o banco PostgreSQL

**Opção A: Docker (mais simples).** Os valores abaixo já combinam com o `.env.example`:

```bash
docker run --name techdiagnose-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=techdiagnose \
  -p 5432:5432 -v techdiagnose-data:/var/lib/postgresql/data \
  -d postgres:17
```

Depois de reiniciar o computador, religue o contêiner com `docker start techdiagnose-db`
(rodar o `docker run` de novo daria erro de nome já em uso).

**Opção B: PostgreSQL instalado na máquina.** Crie o usuário e o banco (ajuste os valores se quiser):

```bash
psql -U postgres -c "CREATE USER \"user\" WITH PASSWORD 'password';"
psql -U postgres -c "CREATE DATABASE techdiagnose OWNER \"user\";"
```

### 5.3 Configurar as variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env          # Windows (cmd): copy apps\api\.env.example apps\api\.env
cp apps/web/.env.example apps/web/.env          # opcional
```

Edite `apps/api/.env` conforme a tabela:

| Variável | Para que serve | Valor de desenvolvimento |
|---|---|---|
| `PORT` | Porta da API | `3000` (padrão se omitida) |
| `DATABASE_URL` | Conexão com o PostgreSQL | `postgresql://user:password@localhost:5432/techdiagnose?schema=public` |
| `JWT_SECRET` | Segredo que assina os tokens de login | Qualquer texto longo e aleatório (veja abaixo) |
| `JWT_EXPIRES_IN` | Validade do token | `1d` |
| `CORS_ORIGIN` | Endereço do frontend que pode chamar a API | `http://localhost:5173` |

Anatomia da `DATABASE_URL`: `postgresql://USUARIO:SENHA@HOST:PORTA/BANCO?schema=public`. Ela precisa bater com o
que você criou no passo 5.2.

Para gerar um `JWT_SECRET` decente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

A API **recusa subir** se alguma variável obrigatória faltar, com uma mensagem apontando qual. O arquivo `.env`
está no `.gitignore`: **nunca o envie para o repositório.** O `apps/web/.env` é opcional: em desenvolvimento o Vite
já encaminha `/api` para `http://localhost:3000` (proxy configurado em `apps/web/vite.config.js`).

### 5.4 Criar as tabelas (Prisma)

```bash
npm run prisma:generate      # gera o cliente do Prisma a partir do schema.prisma
npm run prisma:migrate       # aplica as migrations de apps/api/prisma/migrations
```

Devem ser aplicadas 3 migrations (`init`, `add_incident`, `add_diagnosis`), criando as tabelas `User`, `Incident` e
`Diagnosis`. Para olhar o banco numa interface web: `cd apps/api && npx prisma studio`.

### 5.5 Subir a API e o frontend (dois terminais)

```bash
# terminal 1
npm run dev:api              # http://localhost:3000  (reinicia sozinha ao salvar arquivos)

# terminal 2
npm run dev:web              # http://localhost:5173
```

Confira a API: abra `http://localhost:3000/api/health` no navegador. Deve responder `{"status":"ok"}`.

### 5.6 Roteiro de teste manual (valida tudo de ponta a ponta)

1. Abra `http://localhost:5173`. Você será levado ao login. Clique em **Criar conta** e cadastre-se.
2. Na Dashboard, clique em **Relatar Novo Problema** e preencha, por exemplo:
   - Título: `Computador com problemas`
   - Equipamento: `Desktop Dell`
   - Descrição: `Computador lento e sem internet` (mínimos: título 3, equipamento 2, descrição 10 caracteres)
3. De volta à Dashboard, veja a mensagem de sucesso e o card do chamado. Clique em **Executar Diagnóstico**.
4. Você chega à tela de diagnóstico. Deve ver 4 hipóteses (2 da KS1_Hardware, 2 da KS2_Network), cada uma com 50%
   e uma evidência (a tabela da [seção 3](#3-exemplo-completo-de-um-diagnóstico)).
5. Teste outros relatos. Textos que ativam cada especialista:

| Especialista | Exemplo de descrição |
|---|---|
| KS1_Hardware | `O notebook está aquecendo, fazendo barulho e desliga sozinho` |
| KS2_Network | `Estou offline: o wi-fi conecta mas o site não abre` |
| KS3_OperatingSystem | `Tela azul toda vez que ligo o Windows` |
| KS4_Software | `O Excel está fechando sozinho e dá erro ao abrir a planilha` |
| KS5_Security | `Arquivo bloqueado, acesso negado e um pop-up de vírus` |

### 5.7 Promover um usuário a TECH ou ADMIN

O cadastro sempre cria `USER`. Para testar outros papéis, abra o `prisma studio` (passo 5.4), tabela `User`, e altere
o campo `role`. Faça login de novo para o token refletir o papel.

### 5.8 Rodar os testes

```bash
npm test                     # API + web. Não precisam de banco nem de servidor rodando.
```

### 5.9 Deu certo se...

- [ ] `GET /api/health` responde `{"status":"ok"}`
- [ ] Você consegue criar conta, entrar e sair
- [ ] Um incidente criado aparece na Dashboard
- [ ] "Executar Diagnóstico" leva à tela com hipóteses e barras de confiança
- [ ] `npm test` termina sem falhas

---

## 6. Estrutura do repositório

```text
techdiagnose/
├── package.json                 workspaces e scripts da raiz (dev:api, dev:web, test, prisma:*)
├── README.md                    este arquivo
└── apps/
    ├── api/                     BACKEND (Express + Prisma), em ESM
    │   ├── .env.example
    │   ├── prisma/
    │   │   ├── schema.prisma    modelos User, Incident, Diagnosis
    │   │   └── migrations/      uma pasta por mudança no banco (não edite as antigas)
    │   └── src/
    │       ├── server.js        só chama app.listen
    │       ├── app.js           monta Express: cors, json, rotas em /api, errorHandler
    │       ├── config/env.js    lê e valida o .env com Zod
    │       ├── domain/          NÚCLEO: regras puras, sem frameworks
    │       │   ├── entities/    User, Incident, Diagnosis, Fact, Hypothesis, Evidence
    │       │   ├── errors/      erros de domínio (DomainErrors.js)
    │       │   ├── blackboard/  Blackboard.js
    │       │   ├── knowledge-sources/
    │       │   │   ├── KnowledgeSource.js     classe base: canExecute() e execute()
    │       │   │   ├── KS1_Hardware/ ... KS5_Security/
    │       │   │   ├── shared/keywordAnalysis.js   análise de palavras-chave comum às KS
    │       │   │   └── index.js
    │       │   └── control/     ControlComponent.js
    │       ├── application/     CASOS DE USO e PORTAS (interfaces)
    │       │   ├── ports/       UserRepository, IncidentRepository, DiagnosisRepository, HashService, TokenService
    │       │   └── use-cases/   auth/, incidents/, diagnosis/
    │       ├── infra/           IMPLEMENTAÇÕES técnicas das portas
    │       │   ├── database/    client do Prisma e repositórios Prisma*
    │       │   └── security/    BcryptHashService, JwtTokenService
    │       └── interfaces/http/ ENTRADA HTTP
    │           ├── controllers/ traduzem HTTP <-> casos de uso
    │           ├── middlewares/ authMiddleware, roleMiddleware, errorHandler
    │           ├── routes/      *Routes.js e index.js (montagem das dependências)
    │           └── validators/  schemas Zod
    └── web/                     FRONTEND (React + Vite + Tailwind)
        └── src/
            ├── main.jsx, App.jsx
            ├── pages/           Login, Register, Dashboard, CreateIncident, IncidentList, DiagnosisResult
            ├── routes/          AppRoutes.jsx, ProtectedRoute.jsx
            ├── contexts/        AuthContext.jsx (sessão do usuário)
            ├── services/api.js instância do Axios (token JWT e tratamento de 401)
            └── tests/
```

Os testes ficam em pastas `tests/` ao lado do código que testam (por exemplo `domain/blackboard/tests/`).

### Mapa rápido: "preciso mexer em X, onde vou?"

| Quero... | Vá para |
|---|---|
| Mudar regras/palavras-chave de um especialista | `domain/knowledge-sources/KS*/KS*.js` (constante `HYPOTHESIS_RULES`) |
| Mudar como a confiança é calculada | `domain/knowledge-sources/shared/keywordAnalysis.js` (`calculateConfidence`) |
| Mudar a ordem/prioridade dos especialistas | `application/use-cases/diagnosis/RunDiagnosis.js` (`createKnowledgeSources`) |
| Mudar o loop do diagnóstico | `domain/control/ControlComponent.js` (com cuidado, veja [Convenções](#16-convenções-do-projeto)) |
| Adicionar um endpoint | `interfaces/http/routes`, `controllers`, `application/use-cases` (veja [receita 15.2](#152-adicionar-um-endpoint-novo)) |
| Mudar o banco | `prisma/schema.prisma` + migration (veja [receita 15.3](#153-alterar-o-banco-de-dados)) |
| Mudar a tela de resultado | `apps/web/src/pages/DiagnosisResult.jsx` |
| Mudar a lista de chamados | `apps/web/src/pages/IncidentList.jsx` |

---

## 7. Arquitetura em camadas (e as regras para não quebrá-la)

O backend segue uma arquitetura em camadas (inspirada em Clean/Hexagonal Architecture). A ideia central: **o núcleo
(domínio) não conhece o mundo externo.** Banco, HTTP e criptografia são detalhes plugados nas bordas.

```text
  HTTP (Express)                                              Banco / bibliotecas
       |                                                             ^
       v                                                             |
 interfaces/http  ---->  application  ---->  domain  <----  infra  --+
 (controllers,           (casos de uso,      (entidades,    (Prisma, bcrypt, jwt)
  rotas, validators)      portas)             Blackboard,    implementa as PORTAS
                                              KS, Control)   definidas em application
```

| Camada | Contém | Pode importar | **Não** pode importar |
|---|---|---|---|
| `domain` | Entidades, erros, Blackboard, KS, Control | Só `domain` e JavaScript puro (`node:crypto` é aceito) | Express, Prisma, Zod, bcrypt, jsonwebtoken, `application`, `infra`, `interfaces`, `config` |
| `application` | Casos de uso e portas | `domain` | Express, Prisma, bcrypt, jsonwebtoken |
| `infra` | Repositórios Prisma, bcrypt, JWT | `domain`, `application` (portas) | `interfaces` |
| `interfaces/http` | Controllers, rotas, middlewares, validators | Tudo acima | Regra de negócio (controller só orquestra) |

**Portas e adaptadores, em uma frase:** a porta (`application/ports/UserRepository.js`) diz *o que* o caso de uso
precisa ("buscar usuário por e-mail"); o adaptador (`infra/database/repositories/PrismaUserRepository.js`) diz *como*
isso é feito com o Prisma. Em testes, trocamos o adaptador por um falso. É por isso que os testes dos casos de uso
não precisam de banco.

**Onde as dependências são montadas:** nos arquivos `interfaces/http/routes/*Routes.js` (injeção manual:
cria o repositório, entrega ao caso de uso, entrega ao controller).

**Quem garante a regra:** `src/tests/domainPurity.test.js` falha se algum arquivo de `domain/` importar um framework
ou outra camada.

---

## 8. Como uma requisição percorre o sistema

Exemplo: o usuário clica em **Executar Diagnóstico**.

1. `IncidentList.jsx` chama `api.post('/incidents/<id>/diagnose')` (Axios, que injeta o token JWT).
2. O proxy do Vite encaminha para `POST http://localhost:3000/api/incidents/<id>/diagnose`.
3. `authMiddleware` valida o token e preenche `req.user = { id, role, email }` (401 se inválido).
4. `DiagnosisController.run` chama `RunDiagnosis.execute({ incidentId, userId })`. Não tem regra de negócio.
5. `RunDiagnosis`:
   1. busca o incidente com `incidentRepository.findById(incidentId, userId)`. Se não existir **ou for de outro
      usuário**, lança `IncidentNotFoundError` (vira 404);
   2. cria um `Blackboard` novo com título, descrição e equipamento;
   3. cria as 5 KS (a ordem da lista é a prioridade) e entrega ao `ControlComponent`;
   4. `control.run(blackboard)` faz o loop e devolve `{ state, iterations, finishedBy }`;
   5. valida e salva via `diagnosisRepository.create(...)`, que grava o `state` direto na coluna Json.
6. O controller responde `201 { diagnosis }`; o frontend redireciona para `/incidents/<id>/diagnosis`.
7. `DiagnosisResult.jsx` chama `GET /incidents/<id>/diagnosis` e desenha os cards.

---

## 9. API HTTP

Base: `http://localhost:3000/api`. Corpo e resposta em JSON. Rotas protegidas exigem o cabeçalho
`Authorization: Bearer <token>` (o token vem do login/cadastro).

| Método e caminho | Auth | Corpo | Sucesso |
|---|---|---|---|
| `GET /health` | não | | `200 { status: "ok" }` |
| `POST /auth/register` | não | `{ name, email, password }` | `201 { user, token }` |
| `POST /auth/login` | não | `{ email, password }` | `200 { user, token }` |
| `GET /auth/me` | sim | | `200 { user }` |
| `POST /incidents` | sim | `{ title, description, equipment }` | `201 { incident }` |
| `GET /incidents` | sim | | `200 { incidents }` (mais recentes primeiro, só do usuário) |
| `GET /incidents/:id` | sim | | `200 { incident }` |
| `POST /incidents/:id/diagnose` | sim | | `201 { diagnosis }` (executa **e salva**) |
| `GET /incidents/:id/diagnosis` | sim | | `200 { diagnosis }` (o mais recente) |

Regras de validação: `name` mínimo 2; `email` válido; `password` mínimo 6; `title` mínimo 3; `description` mínimo 10;
`equipment` mínimo 2.

Formato de um `diagnosis`: `{ id, incidentId, state, iterations, finishedBy, createdAt }`, em que `finishedBy` é
`"NO_MORE_ACTIONS"` (terminou naturalmente) ou `"MAX_ITERATIONS_REACHED"` (cortado pelo limite) e `state` é o JSON
da [seção 3](#3-exemplo-completo-de-um-diagnóstico).

### Erros

Sempre `{ "error": "mensagem em português" }`. Erros de validação trazem também `details` (campo e mensagem).

| Status | Quando |
|---|---|
| 400 | Dados inválidos |
| 401 | Sem token, token inválido/expirado ou credenciais erradas |
| 404 | Incidente inexistente **ou de outro usuário** (de propósito, para não revelar que existe); incidente ainda sem diagnóstico |
| 409 | E-mail já cadastrado |
| 500 | Erro inesperado (`{ "error": "Erro interno do servidor" }`; o detalhe vai para o log) |

### Testando com curl

```bash
# cadastro (guarde o "token" da resposta)
curl -s -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@exemplo.com","password":"123456"}'

export TOKEN="cole-o-token-aqui"

# relatar um incidente (guarde o "id" da resposta)
curl -s -X POST http://localhost:3000/api/incidents -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Computador com problemas","description":"Computador lento e sem internet","equipment":"Desktop Dell"}'

# diagnosticar e consultar
curl -s -X POST http://localhost:3000/api/incidents/<ID>/diagnose -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/api/incidents/<ID>/diagnosis -H "Authorization: Bearer $TOKEN"
```

No Windows, use o Postman, Insomnia ou a extensão Thunder Client do VS Code.

---

## 10. Banco de dados

Três tabelas, em cadeia:

```text
User 1 ---- N Incident 1 ---- N Diagnosis
```

| Tabela | Campos principais |
|---|---|
| `User` | `id` (uuid), `name`, `email` (único), `password` (hash bcrypt), `role` (`USER`/`TECH`/`ADMIN`), datas |
| `Incident` | `id`, `title`, `description`, `equipment`, `status` (`OPEN`/`IN_PROGRESS`/`RESOLVED`, padrão `OPEN`), `userId`, datas |
| `Diagnosis` | `id`, `incidentId`, `state` (**JSONB**: o resultado de `getState()`), `iterations`, `finishedBy`, `createdAt` |

Pontos de atenção:

- **O Blackboard não é uma tabela.** Fatos, hipóteses e evidências vivem dentro do JSON `Diagnosis.state`.
- Um incidente pode ter **vários** diagnósticos (cada "Executar Diagnóstico" cria um novo); a leitura devolve o mais recente.
- As chaves estrangeiras usam `ON DELETE RESTRICT`: não dá para apagar um usuário com incidentes nem um incidente com diagnósticos.
- `Incident.status` hoje **nunca muda** depois de criado.

### Fluxo para alterar o banco

1. Edite `apps/api/prisma/schema.prisma`.
2. Gere a migration (o `-w apps/api --` é necessário para o nome chegar ao Prisma):

   ```bash
   npm run prisma:migrate -w apps/api -- --name descricao_da_mudanca
   ```

3. Faça commit da nova pasta em `apps/api/prisma/migrations/`. **Nunca edite migrations antigas.**
4. Seus colegas, ao atualizarem o código, rodam `npm run prisma:migrate` (aplica as novas).

Para zerar o banco de desenvolvimento (apaga todos os dados): `cd apps/api && npx prisma migrate reset`.

---

## 11. Frontend

| Rota | Página | Protegida | O que faz |
|---|---|---|---|
| `/login` | `Login.jsx` | não | Entrar |
| `/register` | `Register.jsx` | não | Criar conta |
| `/dashboard` | `Dashboard.jsx` | sim | Boas-vindas, botão "Relatar Novo Problema" e lista de chamados |
| `/incidents/new` | `CreateIncident.jsx` | sim | Formulário de novo chamado |
| `/incidents/:id/diagnosis` | `DiagnosisResult.jsx` | sim | Resultado do diagnóstico |
| qualquer outra | | | Redireciona para `/dashboard` |

- **Sessão:** `contexts/AuthContext.jsx` guarda `user`, `token` e `loading`. O token fica no `localStorage`
  (chave `techdiagnose.token`) e, ao abrir o app, a sessão é restaurada com `GET /auth/me`. Hook: `useAuth()`.
- **Rotas protegidas:** `routes/ProtectedRoute.jsx` mostra "Carregando sessão..." enquanto restaura e manda para
  `/login` se não houver usuário.
- **Chamadas à API:** sempre por `services/api.js`. Ele injeta `Authorization: Bearer <token>` e, em resposta 401
  fora do login/cadastro, limpa o token e leva para `/login`.
- **Idioma:** toda a interface e as mensagens de erro exibidas ao usuário estão em português do Brasil.
- **Visual:** Tailwind com paleta slate (neutros) e teal (destaque); cards brancos sobre fundo `slate-100`.
  Mantenha esse padrão nas novas telas.

---

## 12. Testes

```bash
npm test                              # API + web
npm run test:api                      # só a API
npm run test:web                      # só o web
npm run test -w apps/api -- KS1       # só arquivos cujo nome contém "KS1"
cd apps/api && npx vitest             # modo watch (reexecuta ao salvar)
```

No momento da escrita: **API com 365 testes em 25 arquivos** e **web com 19 testes em 4 arquivos**, todos passando.

| O que é testado | Onde | Como |
|---|---|---|
| Entidades, Blackboard, Control | `domain/**/tests/` | Unitários, JS puro |
| Cada Knowledge Source | `domain/knowledge-sources/KS*/tests/` | Um contrato comum (`tests/ksTestHelpers.js`) mais casos específicos |
| Pureza do domínio | `src/tests/domainPurity.test.js` | Falha se o domínio importar framework ou outra camada |
| Casos de uso | `application/use-cases/**/tests/` | Repositórios falsos |
| Controllers | `interfaces/http/controllers/tests/` | Casos de uso e `res` falsos |
| Rotas HTTP de ponta a ponta | `src/tests/*.routes.test.js` | Supertest + **Prisma falso em memória** (`vi.mock` do client) |
| Repositórios Prisma | `src/tests/Prisma*.test.js` | Cliente Prisma falso |
| Telas e componentes | `apps/web/src/tests/` | Testing Library + jsdom, API mockada |

**Importante:** a suíte automatizada **não usa o PostgreSQL real**. Por isso, depois de mexer em Prisma, schema ou
migrations, rode também o [roteiro manual](#56-roteiro-de-teste-manual-valida-tudo-de-ponta-a-ponta).

Regra de equipe sugerida: nada entra sem `npm test` verde e `npm run build -w apps/web` funcionando.

---

## 13. Onde estamos

O projeto foi construído em blocos, cada um entregando uma fatia completa:

| Bloco | Entrega | Onde |
|---|---|---|
| 1 | Monorepo, Express, Prisma, React + Vite + Tailwind, estrutura em camadas | raiz, `apps/*` |
| 2 | Autenticação JWT com papéis `USER`/`TECH`/`ADMIN` (cadastro, login, `/me`, rotas protegidas no front) | `use-cases/auth`, `Login.jsx`, `Register.jsx` |
| 3 | Gestão de incidentes: criar, listar e ver um incidente (com isolamento por usuário) | `use-cases/incidents`, `CreateIncident.jsx`, `IncidentList.jsx` |
| 4 | Blackboard e entidades `Fact`, `Hypothesis`, `Evidence`; classe base `KnowledgeSource` | `domain/blackboard`, `domain/entities` |
| 5 | As 5 Knowledge Sources, `Evidence.polarity` e métodos `canExecute`/`execute` | `domain/knowledge-sources` |
| 6 | Control Component e caso de uso `RunDiagnosis` | `domain/control` |
| 7 | Persistência do diagnóstico (`Diagnosis`), rotas `diagnose`/`diagnosis` e tela de resultado | `use-cases/diagnosis`, `DiagnosisResult.jsx` |

**Já funciona de ponta a ponta:** cadastro e login; relatar e listar incidentes; executar o diagnóstico; salvar o
resultado; ver hipóteses ordenadas por confiança com suas evidências.

**Estado da verificação:** a suíte automatizada passa, mas ela usa banco falso. O fluxo contra PostgreSQL real (as
migrations e o `prisma generate`) deve ser conferido por quem montar o ambiente, seguindo a [seção 5](#5-primeiros-passos-do-zero-ao-projeto-rodando).
Se algo falhar, anote o erro e avise o responsável pelo projeto.

---

## 14. O que falta implementar

Os 7 blocos do plano original estão concluídos. A lista abaixo reúne **lacunas conhecidas e sugestões de evolução**;
combinem as prioridades com o responsável pelo projeto antes de começar, para não haver trabalho duplicado.
Dificuldade: **F** fácil, **M** média, **D** difícil.

### Produto

| # | Item | Detalhes e por onde começar | Dif. |
|---|---|---|---|
| P1 | Tela de **detalhes do incidente** | O botão "Ver Detalhes" em `IncidentList.jsx` é só um placeholder. O backend já tem `GET /incidents/:id`. Criar a página e a rota. | F |
| P2 | Atalho **"Ver Diagnóstico"** | Hoje "Executar Diagnóstico" sempre cria um novo. Informar na listagem se já existe diagnóstico e mostrar o atalho. | F |
| P3 | **Histórico** de diagnósticos | Hoje só o mais recente é lido. Adicionar uma rota de listagem e uma tela. | F/M |
| P4 | **Atualizar o status** do incidente | `OPEN`/`IN_PROGRESS`/`RESOLVED` existem, mas nada os altera. Criar caso de uso e `PATCH /incidents/:id`. | M |
| P5 | **Editar e excluir** incidente | Hoje só há criar, listar e ver. Atenção à FK `RESTRICT` com `Diagnosis`. | M |
| P6 | **Funcionalidades para `TECH` e `ADMIN`** | `requireRole` existe (`middlewares/roleMiddleware.js`) mas nenhuma rota o usa. Ideias: TECH vê todos os incidentes; ADMIN gerencia papéis. | M/D |
| P7 | **Confirmar ou rejeitar hipóteses** | `Hypothesis.confirm()`/`reject()` existem, mas nada na API ou na tela chama. Exige decidir como atualizar o JSON salvo. | D |
| P8 | Paginação, busca e filtro na lista de chamados | `ListIncidents` e `IncidentList.jsx`. | M |
| P9 | Recuperação de senha e refresh token | Opcional. | D |

### Motor de diagnóstico (Blackboard)

| # | Item | Detalhes e por onde começar | Dif. |
|---|---|---|---|
| M1 | **Ampliar as regras** das KS | Mais palavras-chave e variações. Hoje "lenta", "travou", "permissões" e "wifi" (sem hífen) **não casam**, e o **título não é analisado**. Veja `HYPOTHESIS_RULES` em cada KS e `keywordAnalysis.js`. | F/M |
| M2 | Evidências **`REFUTES`** | Nenhuma KS gera evidência que refuta, embora o modelo suporte. Ex.: "a internet funciona" refuta hipóteses de rede; e a confiança poderia cair. | M/D |
| M3 | KS que **refinam** o que outras escreveram | Mostra melhor o poder do padrão: uma KS cujo `canExecute` depende de hipóteses já presentes no quadro. | M |
| M4 | **Confiança** mais sofisticada | Hoje é `50 + 10 por palavra extra`, limitado a 90 (`calculateConfidence`). | M |
| M5 | **Estratégias de prioridade** no Control e rastro de execução | Hoje: menor índice do array. Ideia: priorizar por confiança; registrar qual KS rodou em cada iteração (o resultado atual é só `{ state, iterations, finishedBy }`). Mudar o Control exige cuidado (veja [Convenções](#16-convenções-do-projeto)). | M |
| M6 | Novas KS (KS6, KS7...) | Receita na [seção 15.1](#151-criar-uma-nova-knowledge-source). | F/M |

### Qualidade e infraestrutura

| # | Item | Detalhes | Dif. |
|---|---|---|---|
| Q1 | **ESLint e Prettier** | Há comentários `eslint-disable` no código, mas nenhuma configuração instalada. | F |
| Q2 | **docker-compose** para o PostgreSQL (e talvez API e web) | Hoje o banco sobe com `docker run` manual. | F |
| Q3 | **Seed** de dados de exemplo | Por exemplo, usuários `TECH` e `ADMIN` e alguns incidentes. | F |
| Q4 | **CI** (GitHub Actions) | Rodar `npm ci`, `npm test` e `npm run build -w apps/web` a cada push. | F/M |
| Q5 | Testes de integração com **banco real** | Hoje o Prisma é falso nos testes HTTP. | M |
| Q6 | Testes de frontend que faltam | `Dashboard`, `Register`, `AuthContext`, `ProtectedRoute`. | F/M |
| Q7 | Extrair o `#handleError` repetido | Os 3 controllers repetem o mapeamento erro de domínio para status HTTP. | F |
| Q8 | Documentação da API (OpenAPI/Swagger) | A tabela da [seção 9](#9-api-http) é manual. | M |
| Q9 | Endurecer a segurança | Rate limit no login, `helmet`, token em cookie httpOnly (hoje em `localStorage`). | M |
| Q10 | Build e deploy de produção | `npm run build -w apps/web` gera `dist/`; falta definir como servir e implantar. | M |
| Q11 | Diagramas e relatório da disciplina | Se a disciplina exigir, documentar a arquitetura (Blackboard e camadas) com diagramas. | F |

---

## 15. Guias práticos (receitas)

### 15.1 Criar uma nova Knowledge Source

Exemplo: `KS6_Printer`, especialista em impressoras.

1. Crie `apps/api/src/domain/knowledge-sources/KS6_Printer/KS6_Printer.js`:

   ```js
   import { KnowledgeSource } from '../KnowledgeSource.js';
   import { applyAnalysis, collectKeywords, planAnalysis } from '../shared/keywordAnalysis.js';

   // Cada regra: a hipótese gerada e as palavras-chave que apontam para ela.
   // Toda palavra deve aparecer em pelo menos uma regra.
   const HYPOTHESIS_RULES = Object.freeze([
     { description: 'Papel atolado na impressora', keywords: ['impressora', 'papel', 'atolado'] },
     { description: 'Toner ou cartucho esgotado', keywords: ['impressora', 'toner', 'cartucho', 'manchas'] },
   ]);

   export class KS6_Printer extends KnowledgeSource {
     get keywords() {
       return collectKeywords(HYPOTHESIS_RULES);
     }

     canExecute(blackboard) {
       return planAnalysis(blackboard, HYPOTHESIS_RULES).length > 0;
     }

     execute(blackboard) {
       applyAnalysis(blackboard, planAnalysis(blackboard, HYPOTHESIS_RULES), this.name);
     }
   }
   ```

2. Exporte em `knowledge-sources/index.js`.
3. Inclua na lista de `createKnowledgeSources()` em `application/use-cases/diagnosis/RunDiagnosis.js`. **A posição
   na lista é a prioridade.**
4. Crie `KS6_Printer/tests/KS6_Printer.test.js` usando o contrato comum. Copie o formato de
   `KS5_Security/tests/KS5_Security.test.js`: `describeKeywordKnowledgeSource({ KsClass, expectedName, specKeywords, scenario })`.
5. Rode `npm run test:api`. Atenção: testes que contam iterações ou listam KS (`RunDiagnosis.test.js`,
   `allKnowledgeSources.test.js`) podem precisar de ajuste se as palavras novas ativarem a KS nos textos de exemplo.

Como a análise funciona (`keywordAnalysis.js`): texto = `description` + `equipment`; tudo em minúsculas e **sem
acentos**; a palavra-chave precisa aparecer como **palavra inteira** (aceita plural `-s`/`-es`), então "ram" não casa com
"programa". Expressões com várias palavras ("site não abre") exigem a expressão completa.

### 15.2 Adicionar um endpoint novo

Siga a ordem de dentro para fora:

1. **Domínio:** entidade/erros novos, se precisar (`domain/entities`, `domain/errors/DomainErrors.js`).
2. **Porta:** novo método em `application/ports/*Repository.js`.
3. **Caso de uso:** `application/use-cases/<area>/MeuCaso.js` (só depende de portas e do domínio).
4. **Infra:** implemente o método em `infra/database/repositories/Prisma*Repository.js`.
5. **Controller:** método fino em `interfaces/http/controllers` (valida entrada com Zod, chama o caso de uso, traduz
   erros em status HTTP).
6. **Rota:** em `interfaces/http/routes/*Routes.js` com `authMiddleware` (e `requireRole` se for restrito); se for um
   arquivo novo, monte-o em `routes/index.js`.
7. **Testes:** caso de uso, controller e, se possível, um teste de rota no estilo de `src/tests/incidents.routes.test.js`.

Lembre-se: toda consulta a dados de usuário deve **filtrar pelo dono** (veja [Armadilhas](#17-armadilhas-conhecidas)).

### 15.3 Alterar o banco de dados

1. Edite `prisma/schema.prisma`.
2. `npm run prisma:migrate -w apps/api -- --name descricao_curta` (gera a migration e atualiza o cliente).
3. Ajuste a entidade e o mapeamento no `Prisma*Repository`.
4. Atualize os testes que usam o Prisma falso.
5. Faça commit da pasta nova de migration.

### 15.4 Criar uma página no frontend

1. Crie o arquivo em `apps/web/src/pages/` e faça as chamadas pelo `services/api.js`.
2. Registre a rota em `routes/AppRoutes.jsx` (dentro do bloco `ProtectedRoute` se exigir login).
3. Todo texto visível em português; trate os estados de carregando, erro e vazio.
4. Teste em `apps/web/src/tests/` mockando a API com `vi.mock('../services/api.js', ...)`
   (veja `DiagnosisResult.test.jsx` como modelo).

### 15.5 Experimentar o motor sem banco nem servidor

Útil para testar uma KS nova rapidamente. Crie o arquivo temporário `apps/api/playground.mjs` (não o envie ao
repositório):

```js
import { Blackboard } from './src/domain/blackboard/Blackboard.js';
import { ControlComponent } from './src/domain/control/ControlComponent.js';
import {
  KS1_Hardware, KS2_Network, KS3_OperatingSystem, KS4_Software, KS5_Security,
} from './src/domain/knowledge-sources/index.js';

const blackboard = new Blackboard({
  title: 'Teste',
  description: 'Computador lento e sem internet',
  equipment: 'Desktop Dell',
});

const control = new ControlComponent({
  knowledgeSources: [new KS1_Hardware(), new KS2_Network(), new KS3_OperatingSystem(), new KS4_Software(), new KS5_Security()],
});

const { state, iterations, finishedBy } = control.run(blackboard);
console.log({ iterations, finishedBy });
console.table(state.hypotheses.map(({ source, confidence, description }) => ({ source, confidence, description })));
```

Rode com `cd apps/api && node playground.mjs`.

---

## 16. Convenções do projeto

- **Idioma:** código (classes, variáveis, rotas, tabelas) em **inglês**, sem misturar ("portinglês"). Textos da
  interface, mensagens de erro da API e dados de domínio (palavras-chave e descrições de hipóteses) em **português do Brasil**.
  Exceção histórica: as pastas e classes das KS têm underscore (`KS1_Hardware`), exatamente como especificado.
- **JavaScript puro**, sem TypeScript. No backend (ESM) os imports **precisam da extensão** (`'./arquivo.js'`).
- **Estilo observado:** 2 espaços, aspas simples, ponto e vírgula. Ainda não há linter (veja Q1).
- **Controllers finos:** só validam a entrada, chamam um caso de uso e traduzem erros. Nada de regra de negócio.
- **Casos de uso** dependem só de portas e do domínio e devolvem objetos simples (`{ incident }`, `{ incidents }`,
  `{ diagnosis }`), nunca entidades cruas.
- **Erros de domínio** (em `domain/errors/DomainErrors.js`) são traduzidos pelo controller:

  | Erro | HTTP |
  |---|---|
  | `ValidationError` | 400 |
  | `InvalidCredentialsError` | 401 |
  | `IncidentNotFoundError`, `DiagnosisNotFoundError` | 404 |
  | `EmailAlreadyExistsError` | 409 |

- **Isolamento por usuário:** todo acesso a incidente ou diagnóstico passa pelo `userId` do token, nunca do corpo da requisição.
- **Control Component e KS:** o `ControlComponent` deve continuar **sem conhecimento de TI** (inclusive em comentários,
  pois o teste procura as palavras-chave no arquivo inteiro). As KS devem continuar independentes entre si.
- **Banco:** migrations só para frente; nunca editar as já aplicadas.
- **Segredos:** `.env` nunca vai para o repositório.
- **Fluxo de trabalho sugerido:** uma branch por tarefa, Pull Request com revisão de outro colega, `npm test` verde
  antes de pedir revisão e um teste novo para cada comportamento novo.

---

## 17. Armadilhas conhecidas

1. **Filtro `undefined` no Prisma é ignorado.** `findMany({ where: { userId: undefined } })` devolve os dados de
   **todos** os usuários. Por isso os repositórios exigem o `userId`/`incidentId` antes de consultar. Mantenha essas
   guardas em repositórios novos.
2. **`npm run prisma:migrate -- --name x` não repassa o nome.** Use `npm run prisma:migrate -w apps/api -- --name x`
   (ou `cd apps/api && npx prisma migrate dev --name x`).
3. **Uma KS cujo `canExecute` não vira `false` depois de rodar** faz o loop só parar no limite (`MAX_ITERATIONS_REACHED`).
4. **`Evidence` exige que a hipótese já esteja no Blackboard** (`addEvidence` lança erro caso contrário). Adicione a
   hipótese antes. `addEvidence` também ignora evidência duplicada (retorna `false`).
5. **`addHypothesis` ignora hipótese duplicada** (mesma descrição, sem diferenciar maiúsculas, acentos e espaços) e
   retorna `false`, sem erro.
6. **Casamento de palavras-chave é por palavra inteira.** "ram" não casa com "programa"; "lenta" não casa com "lento".
7. **Incidente de outro usuário responde 404**, não 403, por decisão de segurança.
8. **Nos testes, as variáveis vêm de `apps/api/vitest.config.js`** e têm precedência sobre o seu `.env`; por isso a suíte roda igual em qualquer máquina.
9. **Depois de mudar o `schema.prisma`,** o cliente precisa ser regenerado (`npm run prisma:generate`; o
   `prisma:migrate` também faz isso).
10. **`createdAt` do `Fact` e dos diagnósticos é gravado como texto ISO 8601** dentro do JSON do `state`.

---

## 18. Solução de problemas

| Sintoma | Causa provável e solução |
|---|---|
| `Variáveis de ambiente inválidas ou ausentes` ao subir a API | Falta o `apps/api/.env` ou alguma variável. Refaça o passo 5.3. |
| `P1001: Can't reach database server` | O PostgreSQL não está rodando ou a `DATABASE_URL` está errada. Rode `docker ps` e, se preciso, `docker start techdiagnose-db`. |
| `@prisma/client did not initialize yet` | Falta gerar o cliente: `npm run prisma:generate`. |
| Docker: `container name "/techdiagnose-db" is already in use` | O contêiner já existe: `docker start techdiagnose-db`. |
| `EADDRINUSE: address already in use :::3000` | Outra coisa usa a porta. Troque `PORT` no `.env` **e** o `target` do proxy em `apps/web/vite.config.js`. |
| Erro de CORS no navegador | `CORS_ORIGIN` precisa ser exatamente a origem do front. Se o Vite subiu em outra porta (ex.: 5174), ajuste o `.env` da API. |
| Cai no login depois de recarregar | Token expirado (`JWT_EXPIRES_IN`, padrão 1 dia) ou o `JWT_SECRET` mudou. Entre de novo. |
| `prisma migrate dev` pede para "resetar" o banco (drift) | O banco de desenvolvimento divergiu das migrations. Se puder perder os dados: `cd apps/api && npx prisma migrate reset`. |
| Falha ao instalar o `bcrypt` | Use Node 20 LTS. No Windows, instale as "Build Tools" do Visual Studio; no Linux, `build-essential` e `python3`. |
| `domainPurity.test.js` falhando | Algum arquivo de `domain/` importou um framework ou outra camada. Mova essa lógica para `infra` ou `application`. |
| Teste do Control falhando por "palavra-chave" | Uma palavra de TI apareceu no `ControlComponent.js`, inclusive em comentário. Reescreva sem ela. |
| `copy`/`cp` não funciona | Windows cmd: `copy origem destino`; PowerShell: `Copy-Item origem destino`. |

---

## 19. Glossário

| Termo | Significado |
|---|---|
| **Incidente** | O problema de TI relatado pelo usuário (título, descrição, equipamento, status). |
| **Diagnóstico** | O resultado salvo de uma execução do motor sobre um incidente. |
| **Blackboard** | O "quadro" em memória onde as KS escrevem fatos, hipóteses e evidências. |
| **Knowledge Source (KS)** | Especialista independente que lê o quadro e escreve nele. |
| **Control Component** | O coordenador que escolhe qual KS executa a cada iteração. |
| **Fato** | Informação objetiva no quadro (o primeiro é o incidente). |
| **Hipótese** | Suspeita de causa, com confiança de 0 a 100. |
| **Evidência** | Justificativa que apoia (`SUPPORTS`) ou refuta (`REFUTES`) uma hipótese. |
| **Iteração** | Uma rodada do loop do Control: uma KS executada. |
| **Caso de uso (use case)** | Uma ação da aplicação (ex.: `RunDiagnosis`), isolada de HTTP e de banco. |
| **Porta (port)** | Interface que o caso de uso exige (ex.: `IncidentRepository`). |
| **Adaptador / infra** | Implementação concreta de uma porta (ex.: `PrismaIncidentRepository`). |
| **Migration** | Arquivo SQL versionado que muda o banco de forma controlada. |
| **JWT** | Token assinado que prova a identidade nas chamadas à API. |

---

## 20. Referências

- Buschmann, F. et al. *Pattern-Oriented Software Architecture, Volume 1: A System of Patterns* (1996): o padrão Blackboard.
- Erman, L. D. et al. *The Hearsay-II Speech-Understanding System* (1980): o sistema clássico que originou a ideia.
- Martin, R. C. *Clean Architecture* e Cockburn, A. *Hexagonal Architecture* (Ports and Adapters): base da divisão em camadas.
- Documentação: [Prisma](https://www.prisma.io/docs), [Vitest](https://vitest.dev), [Vite](https://vitejs.dev), [React Router](https://reactrouter.com), [Tailwind CSS](https://tailwindcss.com/docs).
