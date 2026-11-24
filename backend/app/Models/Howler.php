<?php

namespace App\Models;

use App\Enums\HowlerStatus;
use App\Exceptions\HowlerNotOpenable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A message that screams once and is gone.
 *
 * Lifecycle: sealed -> burned (opened once) or sealed -> expired (nobody opened it). Both end states delete the content
 * (message and audio) and keep only a tombstone, so the link can still say "already delivered" for a while.
 *
 * @property string $id
 * @property string $token_hash
 * @property string|null $recipient_name
 * @property string|null $message
 * @property string|null $audio_path
 * @property array<string, mixed>|null $voice_settings
 * @property HowlerStatus $status
 * @property CarbonInterface $expires_at
 * @property CarbonInterface|null $opened_at
 */
class Howler extends Model
{
    use HasFactory, HasUlids;

    public const LIFETIME_DAYS = 7;

    protected $fillable = ['recipient_name', 'message', 'audio_path', 'voice_settings', 'expires_at'];

    protected function casts(): array
    {
        return [
            'status' => HowlerStatus::class,
            'voice_settings' => 'array',
            'expires_at' => 'datetime',
            'opened_at' => 'datetime',
        ];
    }

    /* ---------- the link token ---------- */

    /**
     * A random URL-safe token: 128 bits, 22 characters (the same strength as a UUID, enough to be unguessable;
     * the links of v1.0.0 had 256 bits and 43 characters and keep working). It is shown once, when the howler is
     * created, and never stored.
     */
    public static function newToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function findByToken(string $token): ?static
    {
        return static::query()->where('token_hash', static::hashToken($token))->first();
    }

    /**
     * Creates a sealed howler.
     *
     * @param  array<string, mixed>|null  $voiceSettings
     * @return array{howler: static, token: string} the token is returned here and nowhere else
     */
    public static function createSealed(
        string $message,
        ?string $recipientName = null,
        ?array $voiceSettings = null,
        ?CarbonInterface $expiresAt = null,
    ): array {
        $token = static::newToken();

        $howler = new static([
            'recipient_name' => $recipientName !== null && trim($recipientName) !== '' ? trim($recipientName) : null,
            'message' => $message,
            'voice_settings' => $voiceSettings,
            'expires_at' => $expiresAt ?? now()->addDays(static::LIFETIME_DAYS),
        ]);
        $howler->token_hash = static::hashToken($token);
        $howler->status = HowlerStatus::Sealed;
        $howler->save();

        return ['howler' => $howler, 'token' => $token];
    }

    /* ---------- state ---------- */

    /**
     * The state as a visitor must see it: a sealed howler past its expiry is already expired, even before the
     * scheduled purge has got round to marking it.
     */
    public function effectiveStatus(?CarbonInterface $now = null): HowlerStatus
    {
        if ($this->status === HowlerStatus::Sealed && ($now ?? now())->greaterThanOrEqualTo($this->expires_at)) {
            return HowlerStatus::Expired;
        }

        return $this->status;
    }

    /**
     * Opens the howler: it becomes burned and the content is deleted. The content is returned here, once, so the
     * caller can deliver it. The caller must hold a row lock (CP7) so two openings cannot both succeed.
     *
     * @return array{message: string, recipient_name: string|null, audio_path: string|null}
     *
     * @throws HowlerNotOpenable when it is already burned or has expired
     */
    public function burn(?CarbonInterface $now = null): array
    {
        $now ??= now();
        $state = $this->effectiveStatus($now);
        if ($state !== HowlerStatus::Sealed) {
            throw new HowlerNotOpenable($state);
        }

        $content = [
            'message' => (string) $this->message,
            'recipient_name' => $this->recipient_name,
            'audio_path' => $this->audio_path,
        ];

        $this->status = HowlerStatus::Burned;
        $this->opened_at = $now;
        $this->message = null;
        $this->audio_path = null;
        $this->save();

        return $content;
    }

    /**
     * Marks a sealed howler as expired and deletes the content. Used by the scheduled purge.
     *
     * @return string|null the path of the audio file the caller must delete from storage
     *
     * @throws HowlerNotOpenable when it was already burned or expired
     */
    public function expire(): ?string
    {
        if ($this->status !== HowlerStatus::Sealed) {
            throw new HowlerNotOpenable($this->status);
        }

        $audio = $this->audio_path;
        $this->status = HowlerStatus::Expired;
        $this->message = null;
        $this->recipient_name = null;
        $this->audio_path = null;
        $this->save();

        return $audio;
    }
}
