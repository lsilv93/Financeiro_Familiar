# 💰 Financeiro Familiar

Sistema de controle financeiro **pessoal e familiar**, mobile-first, no sistema visual **MB Soft UI** (neomorfismo navy com acento verde-lima).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma ORM · PostgreSQL · NextAuth (Auth.js v4, login por email/senha) · Zod.

## Funcionalidades

| Área | O que faz |
|---|---|
| Autenticação | Cadastro/login seguro (senha com bcrypt, sessão JWT). Cada cadastro cria uma **família** com um código de convite; outros membros entram informando o código. |
| Família e perfis | No cadastro, cada pessoa escolhe **Marido, Mulher ou Filho(a)** e **cria uma família** ou **entra com o código**. O botão **Convidar família** abre o WhatsApp com o link `/convite/CODIGO`; ao abrir, a pessoa escolhe entre entrar naquela família ou criar a sua. |
| Isolamento | Cada usuário só acessa os próprios dados pessoais e os dados familiares da **sua** família. Todas as consultas e ações por ID filtram por usuário/família no servidor (acesso a dados de outra família retorna 404). |
| Segurança de acesso | **3 senhas erradas bloqueiam a conta**; o desbloqueio é só pelo link de redefinição enviado ao e-mail (vale 1 h, uso único, invalida sessões antigas). Códigos de convite inválidos: após **3 tentativas** o IP/usuário fica bloqueado por 30 min; o código pode ser trocado em Configurações. |
| Minha reserva | Poupança por banco: **guardar** e **resgatar** (com confirmação obrigatória), histórico, evolução e meta de reserva. |
| Dashboard | Filtros **Dia / Semana / Mês / Ano / Total**, fluxo de caixa, saldo acumulado com projeção, saúde financeira, regra 50/30/20, uso dos cartões e cobertura da reserva. |
| Notícias | Feeds RSS de veículos conhecidos (G1, InfoMoney, Agência Brasil, CNN Brasil, Exame, Folha) classificados em dólar, inflação, investimentos e Brasil, além de cotações (AwesomeAPI) e Selic/IPCA (Banco Central). |
| Tema | Botão para alternar **tema escuro / claro** (preferência salva no navegador). |
| Escopo | **Pessoal** (só quem lançou vê) ou **Familiar** (todos da família veem extrato, pendências, parcelas e resumos). Regra centralizada em `visibleWhere` (`src/lib/session.ts`). |
| Receitas | Salário, PLR, 13º, Férias, Hora Extra, Freelance, Premiação, Empréstimos, Rendimento de Investimentos, Outros. |
| Despesas | Pix, Dinheiro, Débito e Crédito. No crédito é **obrigatório** escolher o cartão. Categorias/subcategorias pré-definidas em `src/lib/categories.ts`. |
| Cartões | Vários cartões (nome, limite, dia de vencimento e fechamento opcional). O vencimento da compra é calculado pela fatura. Mostra limite em aberto/disponível. |
| Parcelas | Compra parcelada gera N parcelas (ex.: 3/12). Ao **pagar** uma parcela, saldo restante e parcelas faltantes são atualizados. |
| Recorrência | "Repetir todo mês" cria uma regra; a tela **Previsão** mostra o mês seguinte e gera os lançamentos pendentes (idempotente). |
| Atrasos | Tela **Contas a pagar** com vencidas (dias de atraso) e a vencer em 7 dias; badge no menu. |
| Alerta | Antes de salvar uma despesa, `/api/budget-check` projeta o saldo do mês. Se ficar negativo ou abaixo da **reserva de emergência**, abre o pop-up *"Este gasto comprometerá seu orçamento mensal / reserva de emergência. Deseja confirmar mesmo assim?"*. Aportes na subcategoria "Reserva de Emergência" não disparam o alerta. |
| Painel | Recebido × Gasto × Saldo atual × Projeção do fim do mês, total investido, dízimos/doações, rosca por categoria, maior gasto do mês, extrato com filtros (período, meio de pagamento, escopo, tipo, situação, categoria, busca). |

### Regras de cálculo
- O **mês** de um lançamento é o do seu *vencimento* (`dueDate`). Para cartão, é o vencimento da fatura.
- **Total recebido / gasto** = lançamentos com situação *paga/recebida*. **Projeção** = todas as receitas − todas as despesas do mês (pagas + previstas).
- O alerta usa o saldo projetado do mês do vencimento no mesmo escopo do lançamento (Pessoal → só seus lançamentos pessoais; Familiar → só os familiares) e o valor da 1ª parcela.
- "Maior gasto do mês" ignora a categoria *Investimentos & Aportes*.

## Estrutura

```
prisma/
  schema.prisma                 # modelo de dados
  migrations/                   # SQL versionado (aplicado com `prisma migrate deploy`)
src/
  app/
    (auth)/login, register      # telas públicas
    (app)/painel, lancamentos, parcelas, atrasos, previsao, cartoes, configuracoes
    api/                        # rotas de API (REST)
  components/                   # Nav, TransactionForm (com pop-up), TransactionList, DonutChart...
  lib/                          # auth, finance (cálculos), validation (zod), categories, dates
```

### Modelo de dados (resumo)
`Family` 1—N `User` · `CreditCard` · `Transaction` · `InstallmentPlan` (1—N `Transaction`) · `RecurringRule` (1—N `Transaction`).
Valores monetários são `Decimal(12,2)`; datas "só dia" são `@db.Date`.

### Principais endpoints
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/register` | Cadastro (cria ou entra em uma família) |
| GET/POST | `/api/transactions` | Listar (filtros: `month`, `from`, `to`, `scope`, `method`, `type`, `status`, `category`, `q`, `page`) / criar (suporta parcelas e recorrência) |
| PUT/DELETE | `/api/transactions/:id` | Editar / excluir (`?plan=true` exclui todas as parcelas) |
| POST | `/api/transactions/:id/pay` | Confirmar (`{"paid":true}`) ou desfazer pagamento |
| POST | `/api/budget-check` | Projeção de saldo + nível de alerta (`OK`/`RESERVE`/`NEGATIVE`) |
| GET | `/api/dashboard?month=YYYY-MM&scope=ALL\|PERSONAL\|FAMILY` | Indicadores do painel |
| GET | `/api/installments` · `/api/overdue` · `/api/forecast` | Parcelas, atrasos/alertas, previsão |
| CRUD | `/api/cards`, `/api/recurring`, `POST /api/recurring/generate` | Cartões e recorrências |
| GET/PUT | `/api/settings` · `POST /api/family/join` | Perfil, reservas, família |

---

## 🧪 Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL / DIRECT_URL / NEXTAUTH_SECRET
npx prisma migrate deploy   # cria as tabelas
npm run dev                 # http://localhost:3000
```

Precisa de um PostgreSQL local (ex.: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=financeiro postgres:16`) ou use direto a URL do Neon/Supabase.

---

## 🚀 Guia de deploy (GitHub + Banco gratuito + Vercel)

### 1) Criar o banco PostgreSQL gratuito

Escolha **uma** das opções. Você precisará de **duas** URLs: `DATABASE_URL` (aplicação) e `DIRECT_URL` (migrações).

**Opção A — Neon (recomendado, simples)**
1. Acesse <https://neon.tech> → *Sign up* → **Create project** (região mais próxima, ex.: São Paulo).
2. No *Dashboard → Connect*, marque **Connection pooling** e copie a string → será a `DATABASE_URL` (host contém `-pooler`).
3. Desmarque *Connection pooling* e copie a string → será a `DIRECT_URL`.
4. Ambas terminam com `?sslmode=require`.

**Opção B — Supabase**
1. <https://supabase.com> → **New project** (guarde a senha do banco).
2. *Project Settings → Database → Connection string*:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL` — acrescente `?pgbouncer=true` ao final.
   - **Direct connection** (porta 5432) ou *Session pooler* → `DIRECT_URL`.
3. Substitua `[YOUR-PASSWORD]` pela senha do projeto.

### 2) Subir o código para o GitHub

```bash
git init -b main
git add .
git commit -m "feat: sistema de controle financeiro pessoal e familiar"
git remote add origin https://github.com/SEU_USUARIO/financeiro_familiar.git
git push -u origin main
```
> O `.env` está no `.gitignore` — **nunca** suba segredos. Só o `.env.example` vai para o repositório.

### 3) Conectar na Vercel (CI/CD automático)

1. <https://vercel.com> → *Add New → Project* → **Import** o repositório do GitHub (autorize o acesso se pedido).
2. *Framework Preset*: **Next.js** (detectado automaticamente). Não altere o *Build Command*: o script `vercel-build` do `package.json` já executa `prisma generate && prisma migrate deploy && next build` — ou seja, **as migrações rodam sozinhas a cada deploy**.
3. Em **Environment Variables**, adicione (para *Production*, *Preview* e *Development*):

| Nome | Valor |
|---|---|
| `DATABASE_URL` | URL pooled do passo 1 |
| `DIRECT_URL` | URL direta do passo 1 |
| `NEXTAUTH_SECRET` | resultado de `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://SEU-APP.vercel.app` (URL final do projeto) |

4. Clique em **Deploy**. Ao terminar, abra a URL, crie sua conta em `/register` e pronto.
5. Se a URL final for diferente da usada em `NEXTAUTH_URL`, ajuste a variável em *Settings → Environment Variables* e faça **Redeploy**.

**Deploy contínuo:** a partir daí, todo `git push` na `main` gera um deploy de produção; branches/PRs geram *Preview Deployments*.

> ⚠️ Previews usam o mesmo banco das variáveis configuradas. Para isolar, crie um segundo banco/branch (o Neon tem *branching*) e use outra `DATABASE_URL`/`DIRECT_URL` apenas no ambiente *Preview*.

### 4) Evoluindo o banco
```bash
# após editar prisma/schema.prisma, localmente:
npx prisma migrate dev --name descricao_da_mudanca
git add prisma && git commit -m "db: descricao_da_mudanca" && git push
```
O deploy na Vercel aplica a nova migração automaticamente.

### 5) E-mail de recuperação de senha
Em **Settings → Environment Variables** da Vercel, adicione **uma** das opções do `.env.example` (SMTP com senha de app do Gmail, ou Resend) e faça **Redeploy**. Sem isso, o botão "Esqueci minha senha" não consegue enviar o link.

### Problemas comuns
- **`Can't reach database server`** → confira `sslmode=require` (Neon) e se usou a URL correta; no Supabase use `?pgbouncer=true` na `DATABASE_URL`.
- **Erro de migração no build** → a `DIRECT_URL` deve ser a conexão *direta* (sem pooler).
- **Login volta para a tela de login** → `NEXTAUTH_SECRET` ausente ou `NEXTAUTH_URL` diferente do domínio acessado.

## Segurança — notas
- Senhas com bcrypt (custo 12); sessões JWT assinadas por `NEXTAUTH_SECRET`.
- Todas as rotas validam a sessão e filtram por usuário/família no servidor; a entrada é validada com Zod.
- Para uso público em larga escala, considere adicionar *rate limiting* nas rotas de login/cadastro (ex.: Upstash Ratelimit) e confirmação de email.
