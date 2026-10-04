# syntax=docker/dockerfile:1
# Amber & Pea Law frontend (React + Vite), served by unprivileged nginx.
# VITE_* values are compiled into the bundle, so pass them as build args:
#   docker build -f frontend/Dockerfile -t amberpea-frontend \
#     --build-arg VITE_API_BASE_URL=https://api.example.com \
#     --build-arg VITE_AI_BASE_URL=https://ai.example.com \
#     --build-arg VITE_SITE_URL=https://www.example.com .

# ---- Build: type-check and bundle ----
FROM node:24.21.0-alpine3.24 AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY frontend/ ./

ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_AI_BASE_URL=http://localhost:8000
ARG VITE_SITE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AI_BASE_URL=$VITE_AI_BASE_URL \
    VITE_SITE_URL=$VITE_SITE_URL
# The sitemap step tries to fetch practice areas/attorneys from the API; if it is not reachable
# during the build, sitemap.xml lists the static routes only.
RUN npm run build

# ---- Runtime: static files on nginx (non-root, port 8080) ----
FROM nginxinc/nginx-unprivileged:1.31.6-alpine3.24
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
