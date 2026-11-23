<?php

namespace App\Actions;

use App\Console\Commands\PurgeHowlers;
use App\Models\Howler;
use App\Services\VoiceGenerator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Creates a sealed howler and, when it can, its voice. The voice is made now (not when it is opened) so the recipient
 * hears it the instant they tap the seal; it is kept in private storage until the howler is opened, then deleted.
 *
 * A failed voice never fails the howler: it is created without audio and the browser reads it with its own voice.
 */
class CreateHowler
{
    public function __construct(private readonly VoiceGenerator $voice) {}

    /** @return array{howler: Howler, token: string, voice: bool} */
    public function __invoke(string $message, ?string $recipientName): array
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed($message, $recipientName);

        $hasVoice = false;
        if ($this->voice->enabled() && ! $this->dailyBudgetReached()) {
            $hasVoice = $this->attachVoice($howler, $message);
        }

        return ['howler' => $howler, 'token' => $token, 'voice' => $hasVoice];
    }

    /** A safety net for the OpenAI bill, on top of the per-IP limits: at most N voices per day for everybody. */
    private function dailyBudgetReached(): bool
    {
        $limit = (int) config('howler.voice_daily_limit');

        return Howler::query()->whereNotNull('voice_settings')->where('created_at', '>=', now()->startOfDay())->count() >= $limit;
    }

    private function attachVoice(Howler $howler, string $message): bool
    {
        $voice = $this->voice->generate($message);
        if ($voice === null) {
            return false;
        }

        $path = PurgeHowlers::AUDIO_DIRECTORY.'/'.$howler->id.'.wav';
        try {
            Storage::put($path, $voice['wav']);
            $howler->forceFill([
                'audio_path' => $path,
                'voice_settings' => ['model' => VoiceGenerator::MODEL, 'voice' => VoiceGenerator::VOICE, 'tokens' => $voice['tokens']],
            ])->save();
        } catch (Throwable $e) {
            // The file may be orphaned; the hourly purge sweeps it.
            Log::warning('howler voice could not be stored', ['reason' => $e::class]);

            return false;
        }

        return true;
    }
}
