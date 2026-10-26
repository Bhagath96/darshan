# Multi-stage build: compile with Node, serve the static files with unprivileged nginx.
#   docker build -t darsan-web .
#   docker run --rm -p 8080:8080 darsan-web      → http://localhost:8080
# Mock API settings are build-time: docker build --build-arg VITE_MOCK_FAILURE_RATE=0.05 .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_MOCK_FAILURE_RATE=0.05
ARG VITE_MOCK_LATENCY_MS=
ARG VITE_MOCK_URL_PARAMS=false
ENV VITE_MOCK_FAILURE_RATE=$VITE_MOCK_FAILURE_RATE \
    VITE_MOCK_LATENCY_MS=$VITE_MOCK_LATENCY_MS \
    VITE_MOCK_URL_PARAMS=$VITE_MOCK_URL_PARAMS
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
