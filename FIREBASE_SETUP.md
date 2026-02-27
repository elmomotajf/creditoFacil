# Firebase Setup

## 1) Criar projeto e Realtime Database

1. Acesse https://console.firebase.google.com/
2. Crie o projeto.
3. Ative Realtime Database.
4. Copie a URL do banco (`https://<project>-default-rtdb.firebaseio.com`).

## 2) Gerar credenciais de Service Account

1. Projeto > Configurações > Contas de serviço.
2. Gerar nova chave privada.
3. Use os campos do JSON para preencher as variáveis de ambiente.

## 3) Variáveis obrigatórias

```env
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com
```

## 4) Regras de segurança (base mínima)

```json
{
  "rules": {
    "loans": {
      ".read": true,
      ".write": true
    },
    "system": {
      ".read": true,
      ".write": true
    }
  }
}
```

Ajuste as regras para seu cenário antes de produção.

## 5) Verificação

- Local: `GET /api/health` deve retornar `firebase: "ok"`.
- Vercel: confirme as env vars em **Production** e faça redeploy.

## Erros comuns

- `Firebase is not initialized`: env vars faltando ou inválidas em Production.
- `Invalid service account`: `FIREBASE_PRIVATE_KEY` incompleta ou mal formatada.
