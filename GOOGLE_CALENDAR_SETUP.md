# Google Calendar Setup

Integração opcional para sincronizar empréstimos/parcelas no Google Calendar.

## 1) Criar credenciais OAuth

1. Acesse https://console.cloud.google.com/
2. Ative **Google Calendar API**.
3. Crie credencial OAuth 2.0 do tipo **Aplicativo Web**.
4. Configure redirect URIs:
   - Local: `http://localhost:3000/api/google/callback`
   - Produção: `https://SEU_DOMINIO/api/google/callback`

## 2) Variáveis de ambiente

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

Em produção, `GOOGLE_REDIRECT_URI` deve apontar para seu domínio da Vercel.

## 3) Fluxo OAuth implementado

- `GET /api/google/auth-url` gera URL OAuth com `access_type=offline`.
- `GET /api/google/callback` troca `code` por tokens.
- Tokens (incluindo `refresh_token`) são persistidos em `system/googleCalendarTokens` no Firebase.
- O backend faz refresh automático do access token quando necessário.

Isso garante funcionamento após redeploy/cold start (sem depender de memória do processo).

## 4) Como testar

1. Faça login no sistema.
2. Clique em **Sincronizar Google Calendar** no sidebar.
3. Autorize a conta Google.
4. Execute sincronização de empréstimos/parcelas.

## Troubleshooting

- `Google Calendar not configured`: faltam `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
- `Google Calendar not authenticated`: OAuth ainda não concluído.
- `token refresh failed`: usuário revogou acesso ou credenciais inválidas; refaça OAuth.
