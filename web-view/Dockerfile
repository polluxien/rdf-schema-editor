FROM node:lts-alpine
WORKDIR /app/frontend

COPY web-view/package*.json ./
RUN npm ci

COPY web-view/ ./
COPY sharedTypes/ /app/sharedTypes/

RUN npm run build

RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
