<?php

namespace App\Http\Controllers;

use App\Enums\HowlerStatus;
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

    /**
     * Reports the state only. It never reveals the content: the message exists only for the one request that opens it.
     * Visiting this link (or a chat app unfurling it) therefore cannot burn or leak anything.
     */
    public function show(string $token): JsonResponse
    {
        $howler = Howler::findByToken($token);
        if ($howler === null) {
            return $this->notFound();
        }

        $status = $howler->effectiveStatus();

        return response()->json([
            'status' => $status->value,
            // The name on the closed envelope is not a secret, but it is gone once the howler is no longer sealed.
            'recipient_name' => $status === HowlerStatus::Sealed ? $howler->recipient_name : null,
        ])->header('Cache-Control', 'no-store');
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['message' => 'This howler does not exist.'], 404)->header('Cache-Control', 'no-store');
    }
}
