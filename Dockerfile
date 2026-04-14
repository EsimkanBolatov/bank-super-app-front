# my-bank-main/Dockerfile
FROM node:20.19-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --legacy-peer-deps
COPY . .

# Обычно React/Vite используют порт 3000 или 5173. Проверьте ваш package.json -> scripts
EXPOSE 8081

# Запускаем Expo именно в веб-режиме и слушаем все адреса (0.0.0.0), чтобы Docker его видел
CMD ["npx", "expo", "start", "--web", "--host", "lan"]
