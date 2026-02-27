# Crédito Fácil

Sistema web para gerenciamento de empréstimos pessoais com backend Node.js + Express, Firebase Realtime Database, autenticação por senha com bcrypt e sessão stateless via JWT.

## Stack

- Backend: Node.js, Express, Firebase Admin SDK
- Frontend: HTML/CSS/JavaScript (vanilla)
- Auth: bcryptjs + JWT
- Deploy: Vercel (serverless)
- Integrações opcionais: Google Calendar e AWS S3

## Requisitos

- Node.js 24.x (recomendado)
- npm >= 9
- Firebase Realtime Database configurado

## Instalação local

```bash
git clone https://github.com/elmomotajf/creditoFacil.git
cd creditoFacil
npm install
cp .env.example .env
```

Preencha o `.env` com seus valores reais.

## Scripts

```bash
npm run dev      # desenvolvimento
npm start        # execução normal
npm run lint     # eslint (falha em qualquer erro)
npm test         # testes unitários
npm run format   # prettier
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa. As obrigatórias para o app funcionar são:

- `JWT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_DATABASE_URL`

Opcionais:

- Google Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- AWS S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- CORS: `CORS_ORIGIN` (lista separada por vírgula)

## Fluxo de autenticação

1. `POST /api/auth/setup-password` define a senha inicial (uma vez).
2. `POST /api/auth/login` valida a senha e retorna JWT.
3. Frontend salva token em `localStorage` e envia `Authorization: Bearer <token>`.
4. Rotas protegidas validam JWT no backend.

## Status padronizados

- Empréstimo (`loan.status`): `active | completed | cancelled`
- Parcela (`installment.status`): `pending | paid | overdue`
- Status de pagamento agregado (`paymentStatus`): `pending | paid | overdue`

## Google Calendar (opcional)

- Tokens OAuth são persistidos em `system/googleCalendarTokens` no Firebase.
- Após redeploy/cold start, a integração continua funcional.
- Use o guia em `GOOGLE_CALENDAR_SETUP.md`.

## Deploy na Vercel

O projeto usa `vercel.json` com `builds`/`routes` para `server-firebase.js` + arquivos estáticos em `public`.

Passos:

1. Importar o repositório no Vercel.
2. Configurar todas as env vars de produção (principalmente Firebase + JWT).
3. Deploy.

### Variáveis obrigatórias em Production

- `JWT_SECRET`
- `NODE_ENV=production`
- `FIREBASE_TYPE=service_account`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_AUTH_URI`
- `FIREBASE_TOKEN_URI`
- `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- `FIREBASE_CLIENT_X509_CERT_URL`
- `FIREBASE_UNIVERSE_DOMAIN`
- `FIREBASE_DATABASE_URL`

## Estrutura

- `server-firebase.js`: servidor principal usado no deploy
- `firebase-service.js`: acesso ao Firebase
- `utils/loan-utils.js`: lógica pura de datas/status/lucro
- `public/`: frontend
- `tests/`: testes unitários
- `FIREBASE_SETUP.md`: setup Firebase
- `GOOGLE_CALENDAR_SETUP.md`: setup Google Calendar

## Troubleshooting rápido

- `Firebase is not initialized`: faltam variáveis do Firebase em Production no Vercel.
- `401 Invalid or expired token`: faça login novamente para obter novo JWT.
- Google não sincroniza: confira `GOOGLE_CLIENT_*`, redirect URI e autorização OAuth.

## Licença

MIT (`LICENSE`).
