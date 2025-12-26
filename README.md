# CardShop (Auto-delivery codes) — Deploy-ready (Render/Railway)

This is a minimal backend MVP for:
- Merchants self-manage products
- Merchants upload codes (stock)
- Customers place orders
- After crypto payment webhook confirms, system auto-fulfills and delivers codes

## 1) Local run

### Requirements
- Node 18+ (recommended 20)
- PostgreSQL

### Setup
```bash
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## 2) Render deploy (Blueprint)
1. Create a new **PostgreSQL** database (Render/Neon/Supabase etc)
2. Import this repo/folder into Render
3. Render will read `render.yaml`
4. Set env vars in Render dashboard:
- DATABASE_URL
- JWT_SECRET
- WEBHOOK_SECRET
- PAYMENT_PROVIDER (optional)

### IMPORTANT: initialize DB schema once
After first deploy, run this one-time command in Render Shell:
```bash
cd server
npx prisma db push
```

## 3) Railway deploy (Dockerfile)
1. Create a new project in Railway and add a Postgres plugin (or external DB)
2. Deploy using Dockerfile (Railway auto-detects `railway.json`)
3. Set env vars:
- DATABASE_URL
- JWT_SECRET
- WEBHOOK_SECRET

### IMPORTANT: initialize DB schema once
Open Railway shell and run:
```bash
cd server
npx prisma db push
```

## 4) API quick test

### Merchant register
POST /auth/register
```json
{"email":"a@a.com","password":"123456"}
```

### Merchant login
POST /auth/login => token

### Create product (merchant)
POST /merchant/products (Bearer token)
```json
{"title":"Netflix Code","priceUsdt":"2.50","description":"1 month"}
```

### Import codes (text)
POST /merchant/products/:id/codes/text (Bearer token)
```json
{"codes":"AAA-BBB-111\nCCC-DDD-222"}
```

### Create order (shop)
POST /shop/orders
```json
{"productId":"xxx","buyerEmail":"buyer@test.com","quantity":1}
```

### Webhook confirm (gateway -> your server)
POST /webhook/payment
Header: x-webhook-signature: <hmac>
Body:
```json
{"orderId":"xxx","status":"paid","invoiceId":"inv_123","txHash":"0xabc"}
```
