FROM node:lts-alpine
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
COPY sharedTypes/ /app/sharedTypes/

EXPOSE 4000
CMD ["npm", "start"]
