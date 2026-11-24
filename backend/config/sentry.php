<?php

use App\Exceptions\HowlerNotFound;
use App\Exceptions\HowlerNotOpenable;
use App\Support\SentryScrubber;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/*
 * Error monitoring (Sentry). Off unless SENTRY_LARAVEL_DSN is set: with no DSN nothing is sent and nothing is slower.
 *
 * Privacy first (docs/guides/DEPLOYMENT.md, ADR-005): the link token and the message must never reach Sentry. Everything here
 * is set to send as little as possible, and App\Support\SentryScrubber cuts every report down before it leaves.
 * Only what finds bugs is kept: the exception, the stack trace, the route and the release.
 */
return [
    'dsn' => env('SENTRY_LARAVEL_DSN'),

    // the commit the running images were built from, so an error points at the code (set by the deploy)
    'release' => env('SENTRY_RELEASE'),
    'environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV', 'production')),

    // no personal data of any kind: no IP, no cookies, no headers, no request body
    'send_default_pii' => false,
    'max_request_body_size' => 'never',
    'include_local_variables' => false,

    // an array callable (not a closure) so the configuration can be cached
    'before_send' => [SentryScrubber::class, 'beforeSend'],
    'before_send_transaction' => [SentryScrubber::class, 'beforeSend'],

    // Expected outcomes are not bugs: a refused input, an unknown link, an already-opened howler, a rate limit.
    'ignore_exceptions' => [
        ValidationException::class,
        HowlerNotFound::class,
        HowlerNotOpenable::class,
        HttpException::class, // 404, 405, 429 and the like
    ],
    'ignore_transactions' => ['/up'],

    // Errors only. Performance tracing is off; turn it on with a rate if it is ever needed (SENTRY_TRACES_SAMPLE_RATE).
    'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE') === null ? null : (float) env('SENTRY_TRACES_SAMPLE_RATE'),
    'enable_logs' => false,
    'enable_metrics' => false,

    // Breadcrumbs (the trail of what happened before an error) can hold queries, cache keys and URLs: all off.
    'breadcrumbs' => [
        'logs' => false,
        'cache' => false,
        'livewire' => false,
        'sql_queries' => false,
        'sql_bindings' => false,
        'queue_info' => false,
        'command_info' => true,
        'http_client_requests' => false,
        'notifications' => false,
    ],
];
