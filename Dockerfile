FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./

RUN mkdir -p /app/server/logs && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

USER node

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
