<?php

namespace App\Http\Controllers;

use App\Actions\OpenHowler;
use App\Enums\HowlerStatus;
use App\Exceptions\HowlerNotFound;
use App\Exceptions\HowlerNotOpenable;
use App\Http\Requests\StoreHowlerRequest;
use App\Models\Howler;
use App\Models\HowlerReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    /**
     * Delivers the content, once. The first request gets the message and the howler burns; every later one gets 410.
     * It is a POST on purpose: link previews and crawlers only ever issue GETs, so they cannot burn a howler.
     */
    public function open(string $token, OpenHowler $open): JsonResponse
    {
        try {
            $content = $open($token);
        } catch (HowlerNotFound) {
            return $this->notFound();
        } catch (HowlerNotOpenable $e) {
            return response()->json([
                'status' => $e->status->value,
                'message' => $e->status === HowlerStatus::Expired ? 'This howler has expired.' : 'This howler was already delivered.',
            ], 410)->header('Cache-Control', 'no-store');
        }

        return response()->json([
            'message' => $content['message'],
            'recipient_name' => $content['recipient_name'],
        ])->header('Cache-Control', 'no-store');
    }

    /**
     * Reports a howler as abusive. Works in any state, because the recipient usually reports after hearing it. The
     * message is already gone by then, so the report keeps the reason only: nothing about the content or the reporter.
     */
    public function report(string $token, Request $request): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', Rule::in(HowlerReport::REASONS)]]);

        $howler = Howler::findByToken($token);
        if ($howler === null) {
            return $this->notFound();
        }

        HowlerReport::create(['howler_id' => $howler->id, 'reason' => $data['reason']]);

        return response()->json(['reported' => true], 201)->header('Cache-Control', 'no-store');
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['message' => 'This howler does not exist.'], 404)->header('Cache-Control', 'no-store');
    }
}
