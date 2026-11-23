<?php

return [
    // A safety net for the OpenAI bill on top of the per-IP limits: after this many voices in a day (for everybody),
    // new howlers are created without a server voice and the browser reads them with its own.
    'voice_daily_limit' => (int) env('HOWLER_VOICE_DAILY_LIMIT', 300),
];
