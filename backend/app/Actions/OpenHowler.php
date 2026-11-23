<?php

namespace App\Actions;

use App\Exceptions\HowlerNotFound;
use App\Exceptions\HowlerNotOpenable;
use App\Models\Howler;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Opens a howler exactly once, however many requests arrive at the same time.
 *
 * The row is read with SELECT ... FOR UPDATE inside a transaction. A concurrent request for the same token waits on that
 * lock; when the first one commits (status burned, content deleted) the second one reads the committed row, sees it is
 * burned and gets HowlerNotOpenable. Only one caller ever receives the content.
 */
class OpenHowler
{
    /**
     * @return array{message: string, recipient_name: string|null, audio_path: string|null}
     *
     * @throws HowlerNotFound when no howler has this token
     * @throws HowlerNotOpenable when it was already burned or has expired
     */
    public function __invoke(string $token): array
    {
        $content = DB::transaction(function () use ($token) {
            $howler = Howler::query()
                ->where('token_hash', Howler::hashToken($token))
                ->lockForUpdate()
                ->first();

            if ($howler === null) {
                throw new HowlerNotFound;
            }

            return $howler->burn();
        });

        // After the commit, so a failure here can never un-burn the howler. Anything missed is swept by the purge.
        if ($content['audio_path'] !== null) {
            Storage::delete($content['audio_path']);
        }

        return $content;
    }
}
