# 💰 Payment Tracker - Sistema de Gerenciamento de Empréstimos

<div align="center">

![Status](https://img.shields.io/badge/status-active-success.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Firebase](https://img.shields.io/badge/firebase-realtime%20database-orange.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Um sistema elegante e completo para gerenciar empréstimos pessoais, rastrear parcelas, registrar comprovantes de pagamento e visualizar análises de lucro em tempo real.

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação-rápida) • [Como Usar](#-como-usar) • [Deploy](#-deploy)

</div>

---

## 🎯 Funcionalidades

### ✨ Principais

- 🔐 **Autenticação Segura**: Sistema de senha única com hash bcryptjs
- 💼 **Gerenciamento de Empréstimos**: Criar, editar, visualizar e deletar empréstimos
- 🧮 **Cálculo Automático**: Juros, valor total, lucro e parcelas calculados em tempo real
- 📊 **Sistema de Parcelas**: Rastreamento completo com status (pendente, pago, atrasado)
- 📸 **Upload de Comprovantes**: Armazene fotos de comprovantes no AWS S3
- 📈 **Dashboard Analítico**: Estatísticas, gráficos de lucro e métricas em tempo real
- 🔍 **Busca e Filtros**: Encontre empréstimos por nome, status e situação de pagamento
- 📱 **Interface Responsiva**: Design moderno que funciona perfeitamente em qualquer dispositivo
- 🔥 **Real-time**: Sincronização automática com Firebase Realtime Database
- 📅 **Integração Google Calendar**: Sincronize vencimentos com sua agenda (opcional)

### 🎨 Interface

- Design clean e moderno
- Gráficos interativos com Chart.js
- Tabelas responsivas e intuitivas
- Sistema de cores para status (verde/amarelo/vermelho)
- Modais elegantes para criação e edição
- Loading states e feedback visual

---

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Firebase Realtime Database
- **Autenticação**: bcryptjs para hash de senhas
- **Storage**: AWS S3 (opcional, para comprovantes)
- **Integrações**: Google Calendar API (opcional)

### Frontend
- **HTML5** + **CSS3** com variáveis CSS
- **JavaScript Vanilla** (sem frameworks)
- **Chart.js** para gráficos
- **Design Responsivo** com Flexbox e Grid

### DevOps
- **Nodemon** para desenvolvimento
- **dotenv** para variáveis de ambiente
- Pronto para deploy em Vercel, Heroku ou Railway

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado:

- ✅ [Node.js](https://nodejs.org/) versão 18.0.0 ou superior
- ✅ [npm](https://www.npmjs.com/) versão 9.0.0 ou superior
- ✅ Uma conta no [Firebase](https://console.firebase.google.com/) (gratuita)
- ⚪ Conta AWS para S3 (opcional, apenas para upload de comprovantes)
- ⚪ Google Cloud Console (opcional, apenas para sincronização de calendário)

---

## 🚀 Instalação Rápida

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/seu-usuario/payment-tracker.git
cd payment-tracker
```

### 2️⃣ Instale as dependências

```bash
npm install
```

### 3️⃣ Configure o Firebase

#### a) Crie um projeto no Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Dê um nome ao projeto (ex: `payment-tracker`)
4. Siga os passos e crie o projeto

#### b) Ative o Realtime Database

1. No menu lateral, vá em **Build** → **Realtime Database**
2. Clique em "Criar banco de dados"
3. Escolha a localização (recomendado: `us-central1`)
4. Inicie no **modo de teste** (você pode ajustar as regras depois)
5. Copie a URL do database (formato: `https://seu-projeto-default-rtdb.firebaseio.com`)

#### c) Baixe as credenciais

1. Vá em **Configurações do projeto** (ícone de engrenagem)
2. Aba **Contas de serviço**
3. Clique em **Gerar nova chave privada**
4. Salve o arquivo como `serviceAccountKey.json` na **raiz do projeto**

⚠️ **IMPORTANTE**: Adicione `serviceAccountKey.json` ao `.gitignore` para não commitar!

### 4️⃣ Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# ==================== FIREBASE ====================
FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com

# ==================== SERVIDOR ====================
PORT=3000
NODE_ENV=development

# ==================== AWS S3 (Opcional) ====================
# Necessário apenas se quiser upload de comprovantes
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=

# ==================== GOOGLE CALENDAR (Opcional) ====================
# Necessário apenas se quiser sincronização com calendário
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

### 5️⃣ Inicie o servidor

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Modo produção
npm start
```

✅ **Pronto!** Acesse http://localhost:3000

---

## 📖 Como Usar

### 🔐 Primeiro Acesso

1. **Acesse** `http://localhost:3000` no navegador
2. **Configure a senha**: Na primeira vez, você verá a tela de configuração
3. **Defina uma senha forte** (mínimo 8 caracteres)
4. **Confirme a senha**
5. **Pronto!** Você será redirecionado para fazer login

### 🏠 Dashboard

O dashboard principal mostra:

- 📊 **Total de Empréstimos**: Quantidade total cadastrada
- ✅ **Empréstimos Ativos**: Em andamento
- 🏁 **Empréstimos Concluídos**: Totalmente pagos
- ⚠️ **Pagamentos Atrasados**: Parcelas vencidas
- 💰 **Lucro Total**: Soma de todos os lucros
- 📈 **Gráfico de Evolução**: Lucro acumulado ao longo do tempo
- 📅 **Próximos Pagamentos**: Lista das 10 próximas parcelas

### ➕ Criando um Empréstimo

1. **Clique** em "+ Novo Empréstimo"
2. **Preencha os dados**:
   - 👤 Nome do amigo
   - 💵 Valor inicial (R$)
   - 📈 Taxa de juros (%)
   - 📅 Data de início
   - 📅 Data final de pagamento
   - 🔢 Número de parcelas
   - ⚠️ Juros por atraso (%) - opcional
   - 📝 Notas - opcional

3. **Visualize o cálculo automático**:
   - ✨ Valor Total (com juros)
   - 💰 Lucro Estimado

4. **Clique** em "Criar Empréstimo"

### 💳 Gerenciando Parcelas

#### Ver Parcelas
1. Vá para a aba **"Empréstimos"**
2. Clique em **"Ver"** em qualquer empréstimo
3. Visualize todas as parcelas com status

#### Marcar como Pago
1. Na lista de parcelas, clique em **"Pagar"**
2. A parcela será marcada como paga
3. A data de pagamento será registrada automaticamente

#### Ver Próximos Pagamentos
1. Acesse a aba **"Próximos Pagamentos"**
2. Veja todas as parcelas pendentes ordenadas por data
3. Marque como paga diretamente da lista

### 🔍 Busca e Filtros

#### Buscar por Nome
- Digite o nome do amigo na barra de busca
- Os resultados são filtrados em tempo real

#### Filtrar por Status do Empréstimo
- **Todos**: Mostra todos os empréstimos
- **Pendentes**: Empréstimos em andamento
- **Pagos**: Empréstimos quitados
- **Atrasados**: Com parcelas vencidas

#### Filtrar por Status de Pagamento
- **Todos**: Todos os empréstimos
- **Totalmente Pagos**: Todas as parcelas quitadas
- **Pagamento Pendente**: Ainda há parcelas a receber
- **Com Atraso**: Pelo menos uma parcela vencida

### 📅 Sincronizar com Google Calendar (Opcional)

1. Configure as credenciais do Google no `.env`
2. No dashboard, clique em **"Sincronizar Google Calendar"**
3. Autorize o acesso à sua conta Google
4. Os vencimentos serão adicionados ao seu calendário automaticamente

---

## 📁 Estrutura do Projeto

```
payment-tracker/
├── 📄 server-firebase.js          # Servidor Express principal
├── 📄 firebase-service.js         # Funções do Firebase
├── 📄 package.json                # Dependências
├── 📄 .env                        # Variáveis de ambiente (não commitar!)
├── 🔑 serviceAccountKey.json      # Credenciais Firebase (não commitar!)
├── 📁 public/
│   ├── 📄 index.html              # HTML principal
│   ├── 📄 app.js                  # Lógica do frontend
│   └── 📄 styles.css              # Estilos CSS
├── 📁 node_modules/               # Dependências (não commitar!)
└── 📄 README.md                   # Este arquivo
```

### Arquivos Importantes

- ✅ Use `server-firebase.js` (não `server.js`)
- ✅ Use `firebase-service-compatible.js` renomeado para `firebase-service.js`
- ✅ Use `app-fixed.js` renomeado para `public/app.js`
- ✅ Nunca commite `serviceAccountKey.json` ou `.env`!

---

## 🔐 Segurança

### Implementado

- ✅ **Hash de Senha**: bcryptjs com 10 rounds
- ✅ **Tokens de Sessão**: Gerados para cada login
- ✅ **Middleware de Autenticação**: Todas as rotas protegidas
- ✅ **Regras do Firebase**: Controle de acesso ao database
- ✅ **HTTPS**: Recomendado para produção
- ✅ **Sanitização**: Validação de inputs

### Recomendações para Produção

1. 🔒 Use HTTPS (SSL/TLS)
2. 🔑 Implemente JWT ao invés de tokens simples
3. 🚦 Adicione rate limiting
4. 🔐 Configure CORS adequadamente
5. 🛡️ Ative regras de segurança do Firebase
6. 📧 Adicione autenticação de dois fatores (2FA)

---

## 🚢 Deploy

### Deploy na Vercel (Recomendado)

#### 1. Instale a Vercel CLI

```bash
npm install -g vercel
```

#### 2. Crie o `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-firebase.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server-firebase.js"
    },
    {
      "src": "/(.*)",
      "dest": "public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 3. Configure as Variáveis de Ambiente

No dashboard da Vercel, adicione:
- `FIREBASE_DATABASE_URL`
- `FIREBASE_CREDENTIALS` (conteúdo do serviceAccountKey.json como string JSON)

#### 4. Deploy

```bash
vercel
```

### Deploy no Heroku

```bash
# Login
heroku login

# Criar app
heroku create payment-tracker

# Adicionar variáveis
heroku config:set FIREBASE_DATABASE_URL=https://...
heroku config:set FIREBASE_CREDENTIALS="$(cat serviceAccountKey.json)"

# Deploy
git push heroku main
```

### Deploy no Railway

1. Conecte seu repositório GitHub ao Railway
2. Adicione as variáveis de ambiente no painel
3. Deploy automático! 🚀

---

## 🐛 Troubleshooting

### ❌ Erro: "SyntaxError: Unexpected identifier 'assert'"

**Solução**: Use `firebase-service-compatible.js` ao invés do arquivo original.

```bash
cp firebase-service-compatible.js firebase-service.js
```

### ❌ Erro: "Cannot find module './serviceAccountKey.json'"

**Soluções**:
1. Verifique se o arquivo existe na raiz do projeto
2. Baixe novamente do Firebase Console
3. Verifique se o nome está correto (case-sensitive)

### ❌ Erro: "FIREBASE_DATABASE_URL is not set"

**Solução**: Crie o arquivo `.env` e adicione a URL:

```env
FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
```

### ❌ Erro: "Permission denied" no Firebase

**Soluções**:
1. Verifique se o `serviceAccountKey.json` está correto
2. Configure as regras de segurança no Firebase Console
3. Para desenvolvimento, use regras permissivas temporariamente:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **Atenção**: Não use regras permissivas em produção!

### ❌ Erro ao marcar parcela como paga

**Solução**: Certifique-se de usar o `app-fixed.js` no frontend:

```bash
cp app-fixed.js public/app.js
```

---

## 📚 Documentação Adicional

Consulte os seguintes arquivos para mais informações:

- 📘 **FIREBASE_SETUP.md** - Guia completo de configuração do Firebase
- 📗 **FIREBASE_BUGS_E_DIFERENCAS.md** - Diferenças entre Firebase e SQL
- 📙 **MUDANCAS_APP_JS.md** - Correções aplicadas no frontend
- 📕 **MELHORIAS_SUGERIDAS.md** - Roadmap com 20+ melhorias futuras
- 📔 **SOLUCAO_ERRO_ASSERT.md** - Como resolver erro de importação JSON

---

## 🎯 Roadmap

### ✅ Implementado

- [x] Autenticação com senha
- [x] CRUD de empréstimos
- [x] Sistema de parcelas
- [x] Dashboard com gráficos
- [x] Busca e filtros
- [x] Integração Firebase
- [x] Upload de comprovantes (S3)
- [x] Integração Google Calendar

### 🔜 Próximas Features

- [ ] Sistema de notificações por email
- [ ] Notificações por WhatsApp
- [ ] Multi-usuário com Firebase Auth
- [ ] Análise de risco por amigo
- [ ] Score de confiabilidade
- [ ] Contratos digitais com assinatura
- [ ] Histórico de comunicação
- [ ] Parcelamento flexível
- [ ] App mobile (React Native)
- [ ] Relatórios em Excel/PDF
- [ ] Integração bancária (Open Banking)
- [ ] Dashboard avançado com mais métricas

Ver lista completa em `MELHORIAS_SUGERIDAS.md`

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Siga estas etapas:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

Desenvolvido com ❤️ para facilitar o gerenciamento de empréstimos pessoais de forma elegante, segura e eficiente.

---

## 📞 Suporte

- 🐛 **Bugs**: Abra uma [issue](https://github.com/seu-usuario/payment-tracker/issues)
- 💡 **Sugestões**: Abra uma [discussion](https://github.com/seu-usuario/payment-tracker/discussions)
- 📧 **Email**: seu-email@example.com

---

## ⭐ Star o Projeto

Se este projeto foi útil para você, considere dar uma ⭐ no GitHub!

---

<div align="center">

**[⬆ Voltar ao topo](#-payment-tracker---sistema-de-gerenciamento-de-empréstimos)**

Made with 🔥 and ☕

</div>