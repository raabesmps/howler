<?php

use Illuminate\Support\Facades\Schedule;

// Retention (ADR-003). The server runs `php artisan schedule:run` every minute (CP10).
Schedule::command('howlers:purge')->hourly()->withoutOverlapping()->onOneServer();
