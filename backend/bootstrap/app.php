<?php

use App\Http\Middleware\ApiSecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [ApiSecurityHeaders::class]);

        // Behind the reverse proxy (Caddy, CP10) the client IP arrives in X-Forwarded-For. The per-IP rate limit needs the
        // real address, so the proxies to trust are listed in TRUSTED_PROXIES (comma separated). Empty means trust none.
        // With Caddy and FastCGI (docker-compose.prod.yml) it stays empty: Caddy passes the real address as the connection address.
        $proxies = array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))));
        if ($proxies !== []) {
            $middleware->trustProxies(at: $proxies);
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Error monitoring. A no-op without SENTRY_LARAVEL_DSN. Reports are scrubbed of tokens and messages first (config/sentry.php).
        Integration::handles($exceptions);

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
