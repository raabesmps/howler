# Development image for the Laravel backend: PHP 8.4 with the extensions the API needs, plus Composer.
# The production image (CP10) is separate and smaller.
FROM php:8.4-cli-alpine

RUN apk add --no-cache git unzip libzip-dev postgresql-dev \
    && docker-php-ext-install pdo_pgsql pcntl zip bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1

WORKDIR /app
