# The web image: Caddy serving the built frontend and passing /api to the app container (PHP-FPM).
# Build from the repository root:  docker build -f docker/web.Dockerfile -t howler-web .

# ---- build the frontend
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Public, build-time values for the page (never secrets): the site URL for link previews, the optional Sentry DSN
ARG VITE_SITE_URL=
ARG VITE_SENTRY_DSN=
ARG VITE_RELEASE=
ENV VITE_SITE_URL=$VITE_SITE_URL VITE_SENTRY_DSN=$VITE_SENTRY_DSN VITE_RELEASE=$VITE_RELEASE
RUN npm run build

# ---- serve it
FROM caddy:2-alpine
COPY --from=frontend /build/dist /srv/www
# Caddy needs the API's public folder only to find index.php; no application code is in this image
COPY backend/public/index.php /srv/api/index.php
COPY deploy/Caddyfile /etc/caddy/Caddyfile
