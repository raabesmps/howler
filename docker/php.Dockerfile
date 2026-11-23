# Development image for the Laravel backend: PHP 8.4 with the extensions the API needs, plus Composer.
# The production image (CP10) is separate and smaller.
FROM php:8.4-cli-alpine

RUN apk add --no-cache git unzip libzip-dev postgresql-dev \
    && docker-php-ext-install pdo_pgsql pcntl zip bcmath opcache

# Keep compiled PHP between requests, also for the built-in server. Without it every request recompiles all of Laravel from
# the mounted project folder, which on Windows (WSL) takes seconds per request. Files are still re-checked every 2 seconds.
RUN { echo 'opcache.enable_cli=1'; echo 'opcache.validate_timestamps=1'; echo 'opcache.revalidate_freq=2'; echo 'opcache.memory_consumption=128'; } > /usr/local/etc/php/conf.d/zz-opcache-dev.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1

WORKDIR /app
