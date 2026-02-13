# Google Calendar Integration Setup

Esta integração permite sincronizar automaticamente seus empréstimos e parcelas com o Google Calendar.

## Pré-requisitos

- Uma conta Google
- Acesso ao Google Cloud Console

## Passo 1: Criar um Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em "Selecionar um projeto" no topo
3. Clique em "NOVO PROJETO"
4. Digite um nome (ex: "Payment Tracker")
5. Clique em "CRIAR"

## Passo 2: Ativar Google Calendar API

1. No painel do Google Cloud Console, clique em "APIs e Serviços"
2. Clique em "Biblioteca"
3. Procure por "Google Calendar API"
4. Clique em "Google Calendar API"
5. Clique em "ATIVAR"

## Passo 3: Criar Credenciais OAuth 2.0

1. Clique em "Credenciais" no menu esquerdo
2. Clique em "CRIAR CREDENCIAIS"
3. Selecione "ID do cliente OAuth"
4. Se solicitado, clique em "CONFIGURAR CONSENTIMENTO"
   - Selecione "Externo"
   - Preencha as informações obrigatórias
   - Clique em "SALVAR E CONTINUAR"
   - Clique em "SALVAR E CONTINUAR" novamente
5. De volta à página de credenciais, clique em "CRIAR CREDENCIAIS" > "ID do cliente OAuth"
6. Selecione "Aplicativo da Web"
7. Adicione os URIs autorizados:
   - `http://localhost:3000`
   - `http://localhost:3000/api/google/callback`
   - Se for usar em produção, adicione também: `https://seu-dominio.com`
8. Clique em "CRIAR"
9. Copie o **Client ID** e o **Client Secret**

## Passo 4: Configurar as Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

Para produção na Vercel, adicione:

```env
GOOGLE_REDIRECT_URI=https://seu-dominio.com/api/google/callback
```

## Passo 5: Usar a Integração

1. Acesse o dashboard do Payment Tracker
2. Clique no botão "📅 Sincronizar Google Calendar"
3. Você será redirecionado para fazer login no Google
4. Autorize o acesso ao Google Calendar
5. Você será redirecionado de volta ao dashboard
6. Os empréstimos e parcelas serão sincronizados automaticamente

## O que é sincronizado?

- **Empréstimos**: Cada empréstimo cria um evento no dia da data final de pagamento (cor azul)
- **Parcelas**: Cada parcela pendente cria um evento no dia do vencimento (cor amarela)

## Troubleshooting

### "Google Calendar não está configurado"
- Verifique se as variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configuradas
- Reinicie o servidor

### "Erro ao sincronizar"
- Verifique se você autorizou o acesso ao Google Calendar
- Tente fazer logout e login novamente
- Verifique se a Google Calendar API está ativada no Google Cloud Console

### Eventos não aparecem no calendário
- Verifique se você está usando a conta Google correta
- Tente sincronizar novamente
- Verifique se há empréstimos e parcelas para sincronizar

## Segurança

- Suas credenciais do Google são armazenadas apenas no servidor
- O token de acesso é renovado automaticamente
- Você pode revogar o acesso a qualquer momento nas configurações da sua conta Google
