<?php

/*
 * CORS for the API. In production the site and the API share one origin (Caddy serves both, ADR-004), so no other
 * origin needs to call the API and none is allowed by default. To allow one (for example a separate frontend during
 * development), list it in CORS_ALLOWED_ORIGINS, comma separated: https://app.example.com
 */
return [
    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept'],

    // the front end reads this to say how long to wait when it is rate limited
    'exposed_headers' => ['Retry-After'],

    'max_age' => 600,

    // no cookies and no credentials are involved anywhere
    'supports_credentials' => false,
];
