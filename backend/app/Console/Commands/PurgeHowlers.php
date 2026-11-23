<?php

namespace App\Console\Commands;

use App\Enums\HowlerStatus;
use App\Models\Howler;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * The retention policy of ADR-003, run every hour:
 *  1. sealed howlers past their expiry become expired and lose their content;
 *  2. tombstones (burned or expired rows) older than TOMBSTONE_DAYS are deleted;
 *  3. audio files that no sealed howler points to are deleted.
 */
class PurgeHowlers extends Command
{
    public const TOMBSTONE_DAYS = 30;

    public const AUDIO_DIRECTORY = 'howlers';

    protected $signature = 'howlers:purge';

    protected $description = 'Expire overdue howlers, delete old tombstones and orphaned audio files';

    public function handle(): int
    {
        $expired = $this->expireOverdue();
        $tombstones = $this->deleteOldTombstones();
        $orphans = $this->deleteOrphanedAudio();

        $this->info("expired {$expired}, tombstones deleted {$tombstones}, orphaned audio files deleted {$orphans}");

        return self::SUCCESS;
    }

    private function expireOverdue(): int
    {
        $count = 0;

        Howler::query()
            ->where('status', HowlerStatus::Sealed->value)
            ->where('expires_at', '<=', now())
            ->pluck('id')
            ->each(function (string $id) use (&$count) {
                // Re-read under a lock: the howler may have been opened a moment ago, and an opening wins.
                $audio = DB::transaction(function () use ($id, &$count) {
                    $howler = Howler::query()->whereKey($id)->lockForUpdate()->first();
                    if ($howler === null || $howler->status !== HowlerStatus::Sealed || $howler->expires_at->isFuture()) {
                        return null;
                    }
                    $count++;

                    return $howler->expire() ?? '';
                });

                if ($audio !== null && $audio !== '') {
                    Storage::delete($audio);
                }
            });

        return $count;
    }

    private function deleteOldTombstones(): int
    {
        $cutoff = now()->subDays(self::TOMBSTONE_DAYS);

        return Howler::query()
            ->where(function ($query) use ($cutoff) {
                $query->where(fn ($q) => $q->where('status', HowlerStatus::Burned->value)->where('opened_at', '<', $cutoff))
                    ->orWhere(fn ($q) => $q->where('status', HowlerStatus::Expired->value)->where('updated_at', '<', $cutoff));
            })
            ->delete();
    }

    private function deleteOrphanedAudio(): int
    {
        $wanted = Howler::query()->whereNotNull('audio_path')->pluck('audio_path')->flip();
        $deleted = 0;

        foreach (Storage::files(self::AUDIO_DIRECTORY) as $file) {
            // Leave files from the last hour alone: one may belong to a howler that is being created right now.
            if (! $wanted->has($file) && Storage::lastModified($file) < now()->subHour()->getTimestamp()) {
                Storage::delete($file);
                $deleted++;
            }
        }

        return $deleted;
    }
}
