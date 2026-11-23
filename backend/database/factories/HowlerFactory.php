<?php

namespace Database\Factories;

use App\Enums\HowlerStatus;
use App\Models\Howler;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Howler>
 */
class HowlerFactory extends Factory
{
    protected $model = Howler::class;

    /** A sealed howler that expires in a week. Its token is random and unknown; use withToken() to know it. */
    public function definition(): array
    {
        return [
            'token_hash' => Howler::hashToken(Howler::newToken()),
            'recipient_name' => fake()->optional(0.6)->firstName(),
            'message' => Str::limit(fake()->sentence(10), 140, ''),
            'audio_path' => null,
            'voice_settings' => null,
            'status' => HowlerStatus::Sealed,
            'expires_at' => now()->addDays(Howler::LIFETIME_DAYS),
            'opened_at' => null,
        ];
    }

    /** Stores the hash of a token you know, so a test can look the howler up by its link. */
    public function withToken(string $token): static
    {
        return $this->state(fn () => ['token_hash' => Howler::hashToken($token)]);
    }

    public function withAudio(string $path = 'howlers/example.wav'): static
    {
        return $this->state(fn () => ['audio_path' => $path]);
    }

    /** Opened once: the content is gone. */
    public function burned(): static
    {
        return $this->state(fn () => [
            'status' => HowlerStatus::Burned,
            'message' => null,
            'audio_path' => null,
            'opened_at' => now()->subMinutes(5),
        ]);
    }

    /** Marked as expired by the purge: the content is gone. */
    public function expired(): static
    {
        return $this->state(fn () => [
            'status' => HowlerStatus::Expired,
            'message' => null,
            'audio_path' => null,
            'opened_at' => null,
            'expires_at' => now()->subDay(),
        ]);
    }

    /** Past its expiry but the purge has not run yet: still stored as sealed, with the content. */
    public function pastExpiry(): static
    {
        return $this->state(fn () => ['expires_at' => now()->subHour()]);
    }
}
