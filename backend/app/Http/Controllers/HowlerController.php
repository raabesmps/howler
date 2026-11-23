<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHowlerRequest;
use App\Models\Howler;
use Illuminate\Http\JsonResponse;

class HowlerController extends Controller
{
    /** Creates a sealed howler. The token is in this response and nowhere else: only its hash is stored. */
    public function store(StoreHowlerRequest $request): JsonResponse
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed(
            $request->validated('message'),
            $request->validated('recipient_name'),
        );

        return response()->json([
            'token' => $token,
            'recipient_name' => $howler->recipient_name,
            'expires_at' => $howler->expires_at->toIso8601String(),
        ], 201)->header('Cache-Control', 'no-store');
    }
}
