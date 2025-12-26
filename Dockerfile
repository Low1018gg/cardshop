# Deploy anywhere: Render/Railway/Fly/VM
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

# NOTE: For first-time deploy, run schema sync once using "npx prisma db push"
CMD ["node", "src/index.js"]
