# Firebase Setup Guide

Este guia ajudará você a configurar o Firebase Realtime Database para o Payment Tracker.

## 1. Criar um Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Criar Projeto"
3. Insira um nome para o projeto (ex: "payment-tracker")
4. Desative "Google Analytics" (opcional) e clique em "Criar Projeto"

## 2. Configurar Realtime Database

1. No Firebase Console, vá para "Realtime Database"
2. Clique em "Criar Banco de Dados"
3. Selecione a localização mais próxima
4. Inicie em modo de teste (você pode mudar as regras depois)
5. Clique em "Ativar"

## 3. Obter Credenciais de Serviço

1. Vá para "Configurações do Projeto" (ícone de engrenagem)
2. Clique em "Contas de Serviço"
3. Clique em "Gerar Nova Chave Privada"
4. Um arquivo JSON será baixado - este é seu `serviceAccountKey.json`

## 4. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY=sua-private-key
FIREBASE_CLIENT_EMAIL=seu-client-email
FIREBASE_DATABASE_URL=https://seu-project-id.firebaseio.com
FIREBASE_STORAGE_BUCKET=seu-project-id.appspot.com

# App Configuration
PORT=3000
NODE_ENV=production
```

### Onde encontrar esses valores:

- **FIREBASE_PROJECT_ID**: Na página de Configurações do Projeto
- **FIREBASE_PRIVATE_KEY**: No arquivo JSON baixado (campo `private_key`)
- **FIREBASE_CLIENT_EMAIL**: No arquivo JSON baixado (campo `client_email`)
- **FIREBASE_DATABASE_URL**: No Realtime Database, clique em "Detalhes" e copie a URL

## 5. Configurar Regras de Segurança (Importante!)

No Firebase Console, vá para "Realtime Database" → "Regras" e adicione:

```json
{
  "rules": {
    "loans": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$loanId": {
        ".validate": "newData.hasChildren(['friendName', 'initialValue', 'interestRate', 'totalValue', 'profit'])",
        "installments": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

## 6. Deploy na Vercel

1. Faça push do seu código para um repositório GitHub
2. Acesse [Vercel](https://vercel.com)
3. Clique em "New Project" e selecione seu repositório
4. Em "Environment Variables", adicione todas as variáveis do `.env`
5. Clique em "Deploy"

## 7. Variáveis de Ambiente na Vercel

Adicione as seguintes variáveis no painel de configuração da Vercel:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY` (copie exatamente como está no JSON, incluindo `\n`)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `PORT=3000`
- `NODE_ENV=production`

## Troubleshooting

### Erro: "Cannot find module 'firebase-admin'"
Execute: `npm install firebase-admin`

### Erro: "Permission denied" no Firebase
Verifique as regras de segurança do Realtime Database

### Erro: "Invalid service account"
Verifique se a chave privada foi copiada corretamente (incluindo quebras de linha)

## Próximos Passos

1. Configure o Google Calendar (veja `GOOGLE_CALENDAR_SETUP.md`)
2. Configure o AWS S3 para upload de fotos (opcional)
3. Teste a aplicação localmente antes de fazer deploy
