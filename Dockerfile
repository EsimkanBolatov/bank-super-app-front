# my-bank-main/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps

# Принудительно ставим react и react-dom версии 19.1.0
RUN npm install react@19.1.0 react-dom@19.1.0 react-native-web @expo/metro-runtime --legacy-peer-deps
COPY . .

# Обычно React/Vite используют порт 3000 или 5173. Проверьте ваш package.json -> scripts
EXPOSE 8081

# Запускаем Expo именно в веб-режиме и слушаем все адреса (0.0.0.0), чтобы Docker его видел
CMD ["npx", "expo", "start", "--web", "--host", "lan"]