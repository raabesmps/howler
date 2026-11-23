#!/bin/sh
# Starts the app container. php-fpm runs as root only as its master process (its workers are www-data);
# anything else (the scheduler, artisan commands) runs as www-data.
set -e
cd /var/www

# storage is a volume (the voice files, logs, caches): make sure the folders exist and belong to the app
mkdir -p storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Cache the configuration, routes and events from the environment this container has. Code and settings are fixed per
# container, so this is safe and saves work on every request.
su-exec www-data php artisan config:cache
su-exec www-data php artisan route:cache
su-exec www-data php artisan event:cache

if [ "$1" = "php-fpm" ]; then
  exec "$@"
fi
exec su-exec www-data "$@"
