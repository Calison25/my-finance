# Setup Autenticacao Google OAuth - My Finance

Guia passo-a-passo para configurar o login com Google localmente.

> **Nota**: O Supabase migrou para chaves JWT assimétricas (ECC P-256). O backend busca a chave pública automaticamente via JWKS — você **não** precisa copiar nenhum JWT secret.

---

## Passo 1: Copiar chaves do Supabase (1 min)

1. Acesse [app.supabase.com](https://app.supabase.com) e selecione seu projeto
2. Va em **Settings > API** (menu lateral)
3. Copie:

| Campo no Supabase | Onde colar |
|---|---|
| **Project URL** | `SUPABASE_URL` e `VITE_SUPABASE_URL` |
| **anon public** (em API Keys) | `VITE_SUPABASE_ANON_KEY` |

Só isso. Não precisa do JWT Secret — a verificação é feita via JWKS (chave pública).

---

## Passo 2: Criar credenciais Google OAuth (5 min)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto novo ou selecione um existente
3. No menu lateral: **APIs & Services > Credentials**
4. Clique **+ CREATE CREDENTIALS > OAuth client ID**
5. Se pedir, configure a **OAuth consent screen** primeiro:
   - User Type: **External**
   - App name: `My Finance`
   - User support email: seu email
   - Developer contact: seu email
   - Salve (não precisa preencher mais nada)
6. Volte em **Credentials > + CREATE CREDENTIALS > OAuth client ID**
7. Application type: **Web application**
8. Name: `My Finance`
9. Em **Authorized redirect URIs**, adicione:
   ```
   https://SEU-PROJETO.supabase.co/auth/v1/callback
   ```
   > Substitua `SEU-PROJETO` pelo subdomain do seu Supabase (o que vem antes de `.supabase.co` na Project URL)
10. Clique **Create**
11. Copie o **Client ID** e **Client Secret**

---

## Passo 3: Habilitar Google no Supabase (1 min)

1. No Supabase Dashboard: **Authentication > Providers**
2. Encontre **Google** e expanda
3. Ative **Enable Sign in with Google**
4. Cole o **Client ID** e **Client Secret** do passo anterior
5. **Save**

---

## Passo 4: Configurar redirect URLs no Supabase (1 min)

1. No Supabase Dashboard: **Authentication > URL Configuration**
2. **Site URL**:
   ```
   http://localhost:5173
   ```
3. Em **Redirect URLs**, adicione:
   ```
   http://localhost:5173
   ```
4. Salve

---

## Passo 5: Criar arquivos .env (1 min)

### Backend — `.env` na raiz do projeto

```env
DATABASE_URL=postgresql://postgres.XXXXX:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
ENVIRONMENT=development
SUPABASE_URL=https://SEU-PROJETO.supabase.co
```

> O `DATABASE_URL` voce ja deve ter. Se nao, veja em Supabase > Settings > Database > Connection string (URI).

### Frontend — `web/.env`

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=cole-a-anon-key-aqui
```

---

## Passo 6: Rodar as migrations (1 min)

No Supabase Dashboard > **SQL Editor**, execute na ordem:

1. Cole o conteudo de `supabase/migrations/009_create_users_households.sql` → **Run**
2. Cole o conteudo de `supabase/migrations/010_add_household_id.sql` → **Run**
3. Cole o conteudo de `supabase/migrations/011_create_household_invites.sql` → **Run**

> Execute na ordem! Cada migration depende da anterior.

---

## Passo 7: Instalar dependencia Python

```bash
pip install "PyJWT[crypto]==2.9.0"
```

O `[crypto]` instala o `cryptography` necessario para verificar tokens ECC (P-256).

Se estiver usando Docker:
```bash
docker-compose build
```

---

## Passo 8: Rodar o projeto

```bash
# Terminal 1: Backend
docker-compose up
# ou: vercel dev

# Terminal 2: Frontend
cd web && npm run dev
```

Acesse `http://localhost:5173` — tela de login com botao "Entrar com Google".

---

## Troubleshooting

### "redirect_uri_mismatch" no Google
- Verifique se a redirect URI no Google Cloud e exatamente:
  `https://SEU-PROJETO.supabase.co/auth/v1/callback`
- Pode levar ate 5 minutos para propagar

### "Auth error" ou "Invalid token" 401
- Verifique se `SUPABASE_URL` no `.env` esta correto
- O backend busca as chaves públicas em `{SUPABASE_URL}/auth/v1/keys` — teste acessando essa URL no browser, deve retornar um JSON com as keys

### Tela de login aparece mas botao nao funciona
- Abra o console do browser (F12)
- Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estao no `web/.env`
- Reinicie o `npm run dev` apos criar/alterar o `.env`

### "User not provisioned" 401
- O `POST /api/auth/me` nao esta sendo chamado ou esta falhando
- Verifique o console do browser e os logs do backend

---

## Para deploy em producao (Vercel)

1. No Vercel, adicione as env vars:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. No Supabase > Authentication > URL Configuration:
   - Atualize **Site URL** para `https://seu-dominio.vercel.app`
   - Adicione `https://seu-dominio.vercel.app` em **Redirect URLs**

3. No Google Cloud > Credentials:
   - A redirect URI do Supabase (`https://SEU-PROJETO.supabase.co/auth/v1/callback`) nao muda — o Supabase faz o redirect intermediario
