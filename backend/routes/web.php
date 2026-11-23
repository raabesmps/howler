<?php

use Illuminate\Support\Facades\Route;

// The API lives under /api (CP7). The root only says what this is.
Route::get('/', fn () => response()->json(['name' => 'howler-api']));
