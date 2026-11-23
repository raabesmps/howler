<?php

return [
    // A safety net for the OpenAI bill on top of the per-IP limits: after this many voices in a day (for everybody),
    // new howlers are created without a server voice and the browser reads them with its own.
    'voice_daily_limit' => (int) env('HOWLER_VOICE_DAILY_LIMIT', 300),

    // Per-IP rate limits. The defaults are the product's; the end-to-end tests raise them so a whole suite can run from one IP.
    'limits' => [
        'create_per_minute' => (int) env('HOWLER_CREATE_PER_MINUTE', 5),
        'create_per_day' => (int) env('HOWLER_CREATE_PER_DAY', 40),
        'access_per_minute' => (int) env('HOWLER_ACCESS_PER_MINUTE', 30),
        'report_per_minute' => (int) env('HOWLER_REPORT_PER_MINUTE', 5),
    ],
];
