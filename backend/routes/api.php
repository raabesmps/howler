<?php

use App\Http\Controllers\HowlerController;
use Illuminate\Support\Facades\Route;

// The howler API (CP7). Contract: docs/api/openapi.yaml. Every route is rate limited per IP (AppServiceProvider).
Route::post('/howlers', [HowlerController::class, 'store'])->middleware('throttle:create-howler');

Route::middleware('throttle:howler-access')->group(function () {
    Route::get('/howlers/{token}', [HowlerController::class, 'show']);
    Route::post('/howlers/{token}/open', [HowlerController::class, 'open']);
});

Route::post('/howlers/{token}/report', [HowlerController::class, 'report'])->middleware('throttle:report-howler');
