FROM node:lts-alpine
RUN apk add --no-cache git docker-cli
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
COPY sharedTypes/ /app/sharedTypes/

EXPOSE 4000
CMD ["npm", "start"]
