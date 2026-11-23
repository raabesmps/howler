<?php

use App\Http\Controllers\HowlerController;
use Illuminate\Support\Facades\Route;

// The howler API (CP7). Contract: docs/api/openapi.yaml.
Route::post('/howlers', [HowlerController::class, 'store']);
