# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Сборка: Vite кладет фронт в dist/public (см. vite.config.ts), сервер собирается в dist/index.js
RUN npm run build

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Копируем только артефакты сборки и манифесты
COPY --from=builder /app/dist ./dist
COPY package*.json ./
# Ставим только прод-зависимости
RUN npm ci --omit=dev --no-audit --no-fund
EXPOSE 5000
CMD ["node", "dist/index.js"] 