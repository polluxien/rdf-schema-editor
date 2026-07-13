FROM node:lts-alpine
WORKDIR /app/frontend

COPY web-view/package*.json ./
RUN npm ci

COPY web-view/ ./
COPY sharedTypes/ /app/sharedTypes/

# Vite inlines import.meta.env.VITE_* at build time, so these must be passed as
# build args (docker-compose's `environment:` only applies at container runtime
# and has no effect on the already-built static bundle)
ARG VITE_REAL_FETCH=false
ARG VITE_USE_MOCK_DATA=true
ARG VITE_APP_API_BASE_URL=http://localhost:4000
ARG VITE_FRONTEND_BASE_URL=http://localhost:3000
ENV VITE_REAL_FETCH=$VITE_REAL_FETCH
ENV VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA
ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL
ENV VITE_FRONTEND_BASE_URL=$VITE_FRONTEND_BASE_URL

RUN npm run build

RUN npm install -g serve
EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
