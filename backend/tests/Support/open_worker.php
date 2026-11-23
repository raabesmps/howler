<?php

/**
 * A separate PHP process for the concurrency test: it boots the app, waits until the agreed instant so every worker fires
 * together, opens the howler and prints "ok" (it got the message), "gone" (410) or "error".
 *
 * Usage: php open_worker.php <token> <start-at-unix-microtime>
 */

use App\Actions\OpenHowler;
use App\Exceptions\HowlerNotOpenable;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[, $token, $startAt] = $argv;
while (microtime(true) < (float) $startAt) {
    usleep(200);
}

try {
    (new OpenHowler)($token);
    echo 'ok';
} catch (HowlerNotOpenable) {
    echo 'gone';
} catch (Throwable $e) {
    echo 'error: '.$e->getMessage();
}
