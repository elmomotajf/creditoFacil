# Payment Tracker - Sistema de Gerenciamento de Empréstimos

Um sistema elegante e completo para rastrear empréstimos pessoais a amigos, gerenciar parcelas, registrar comprovantes de pagamento e visualizar análises de lucro.

## 🎯 Funcionalidades

- **Autenticação por Senha Única**: Acesso seguro com apenas uma senha forte
- **Gerenciamento de Empréstimos**: Criar, editar, visualizar e deletar empréstimos
- **Cálculo Automático**: Juros, valor total e lucro calculados automaticamente
- **Gerenciamento de Parcelas**: Rastreamento de parcelas com status (pendente, pago, atrasado)
- **Upload de Comprovantes**: Armazene fotos de comprovantes de pagamento no S3
- **Dashboard Elegante**: Visualize estatísticas, gráficos e próximos pagamentos
- **Interface Responsiva**: Design moderno que funciona em desktop e mobile

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express
- **Database**: PostgreSQL com Prisma ORM
- **Frontend**: HTML5 + CSS3 + JavaScript Puro (Vanilla JS)
- **Storage**: AWS S3 para armazenamento de fotos
- **Autenticação**: bcryptjs para hash de senha

## 📋 Pré-requisitos

- Node.js 16+ instalado
- PostgreSQL database (online ou local)
- Conta AWS com acesso ao S3 (opcional, para upload de fotos)

## 🚀 Instalação e Setup

### 1. Clone o repositório

```bash
git clone <seu-repositorio>
cd payment-tracker
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database_name"

# JWT Secret
JWT_SECRET="sua-chave-secreta-muito-forte-aqui"

# AWS S3 (opcional)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="sua-chave-de-acesso"
AWS_SECRET_ACCESS_KEY="sua-chave-secreta"
AWS_S3_BUCKET="seu-bucket-name"

# Server
PORT=3000
NODE_ENV="development"
```

### 4. Configure o banco de dados

Execute as migrações do Prisma:

```bash
npm run db:push
```

### 5. Inicie o servidor

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

## 📖 Como Usar

### Primeiro Acesso

1. Abra `http://localhost:3000` no navegador
2. Na primeira vez, você verá a tela de configuração de senha
3. Defina uma senha forte (mínimo 8 caracteres)
4. Confirme a senha

### Acessando o Sistema

1. Digite sua senha para entrar no dashboard
2. Você será redirecionado para o painel principal

### Criando um Empréstimo

1. Clique em "Novo Empréstimo"
2. Preencha os dados:
   - Nome do amigo
   - Valor inicial
   - Taxa de juros (%)
   - Data final de pagamento
   - Número de parcelas
3. Clique em "Criar Empréstimo"

### Gerenciando Parcelas

1. Acesse a aba "Próximos Pagamentos"
2. Clique em "Marcar como Pago" para uma parcela
3. Você pode anexar um comprovante de pagamento

### Visualizando Dashboard

O dashboard mostra:
- Total de empréstimos
- Empréstimos ativos
- Empréstimos concluídos
- Pagamentos atrasados
- Lucro total
- Lista de próximos pagamentos

## 📁 Estrutura do Projeto

```
payment-tracker/
├── server.js              # Servidor Express principal
├── package.json           # Dependências do projeto
├── prisma/
│   └── schema.prisma      # Schema do banco de dados
├── public/
│   ├── index.html         # HTML principal
│   ├── app.js             # Aplicação JavaScript
│   └── styles.css         # Estilos CSS
└── README.md              # Este arquivo
```

## 🔐 Segurança

- Senhas são armazenadas com hash bcryptjs
- Tokens de sessão são gerados para cada login
- Todas as rotas da API requerem autenticação
- Arquivos são armazenados de forma segura no S3

## 🚢 Deploy na Vercel

### 1. Prepare o projeto para Vercel

Crie um arquivo `vercel.json` na raiz:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
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
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "public/index.html"
    }
  ]
}
```

### 2. Configure variáveis de ambiente na Vercel

No dashboard da Vercel, adicione as variáveis:
- `DATABASE_URL`
- `JWT_SECRET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`

### 3. Deploy

```bash
npm install -g vercel
vercel
```

## 🐛 Troubleshooting

### Erro de conexão com banco de dados

Verifique se:
- A URL do banco de dados está correta
- O banco de dados está acessível
- As credenciais estão corretas

### Erro ao fazer upload de fotos

Verifique se:
- As credenciais AWS estão corretas
- O bucket S3 existe e está acessível
- As permissões do bucket permitem upload

### Erro ao criar empréstimo

Verifique se:
- Todos os campos obrigatórios foram preenchidos
- A data final é posterior à data atual
- O número de parcelas é maior que 0

## 📝 Licença

MIT

## 👨‍💻 Autor

Desenvolvido com ❤️ para gerenciar empréstimos pessoais de forma elegante e eficiente.

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório.
