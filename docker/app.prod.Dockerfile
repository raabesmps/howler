# Production image for the Laravel API: PHP-FPM, no development tools, code and dependencies baked in.
# Build from the repository root:  docker build -f docker/app.prod.Dockerfile -t howler-app .
# Nothing secret is in the image: every setting comes from the environment of the container (deploy/env.production.example).

FROM php:8.4-fpm-alpine AS base
RUN apk add --no-cache su-exec libzip-dev postgresql-dev \
    && docker-php-ext-install pdo_pgsql bcmath opcache pcntl zip

# ---- dependencies: composer runs here and never reaches the final image
FROM base AS vendor
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /app
COPY backend/ ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader \
    && rm -rf /root/.composer storage/logs/* storage/framework/cache/data/* tests

# ---- the image that runs
FROM base AS runtime
COPY docker/php.prod.ini /usr/local/etc/php/conf.d/zz-howler.ini
COPY docker/php-fpm.prod.conf /usr/local/etc/php-fpm.d/zz-howler.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www
COPY --from=vendor --chown=www-data:www-data /app /var/www

ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr

# php-fpm answers on 9000 to the web container only (the port is not published to the host)
EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD pgrep php-fpm >/dev/null || exit 1 # BusyBox pgrep: -x never matches the master process, which calls itself 'php-fpm: master process'
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
