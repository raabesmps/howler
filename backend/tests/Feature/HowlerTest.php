<?php

namespace Tests\Feature;

use App\Enums\HowlerStatus;
use App\Exceptions\HowlerNotOpenable;
use App\Models\Howler;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HowlerTest extends TestCase
{
    use RefreshDatabase;

    /* ---------- creating ---------- */

    public function test_it_creates_a_sealed_howler_with_a_ulid_and_returns_the_token_once(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('You never answer my calls.', 'Ana');

        $this->assertSame(HowlerStatus::Sealed, $howler->status);
        $this->assertMatchesRegularExpression('/^[0-9a-hjkmnp-tv-z]{26}$/', $howler->id);
        $this->assertSame('Ana', $howler->recipient_name);
        $this->assertNotEmpty($token);
    }

    public function test_only_the_hash_of_the_token_is_stored(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hello');

        $row = (array) DB::table('howlers')->where('id', $howler->id)->first();

        $this->assertSame(hash('sha256', $token), $row['token_hash']);
        $this->assertNotContains($token, array_map('strval', $row), 'the raw token must not be in any column');
    }

    public function test_it_finds_a_howler_by_its_token_and_not_by_a_wrong_one(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hello');

        $this->assertTrue(Howler::findByToken($token)?->is($howler));
        $this->assertNull(Howler::findByToken($token.'x'));
        $this->assertNull(Howler::findByToken(''));
    }

    public function test_tokens_are_long_unique_and_url_safe(): void
    {
        $tokens = array_map(fn () => Howler::newToken(), range(1, 200));

        $this->assertCount(200, array_unique($tokens));
        foreach ($tokens as $token) {
            $this->assertGreaterThanOrEqual(43, strlen($token));
            $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]+$/', $token);
        }
    }

    public function test_a_blank_recipient_is_stored_as_null_and_a_name_is_trimmed(): void
    {
        $this->assertNull(Howler::createSealed('Hello', '   ')['howler']->recipient_name);
        $this->assertSame('Ana', Howler::createSealed('Hello', '  Ana ')['howler']->recipient_name);
    }

    public function test_it_expires_in_seven_days_by_default(): void
    {
        $this->freezeTime();
        $howler = Howler::createSealed('Hello')['howler'];

        // the column keeps whole seconds, so compare what was actually stored
        $this->assertSame(now()->addDays(7)->toDateTimeString(), $howler->fresh()->expires_at->toDateTimeString());
    }

    public function test_the_factory_states_all_respect_the_database_rules(): void
    {
        $sealed = Howler::factory()->create();
        $withAudio = Howler::factory()->withAudio()->create();
        $burned = Howler::factory()->burned()->create();
        $expired = Howler::factory()->expired()->create();
        $pastExpiry = Howler::factory()->pastExpiry()->create();

        $this->assertSame(HowlerStatus::Sealed, $sealed->fresh()->status);
        $this->assertSame('howlers/example.wav', $withAudio->fresh()->audio_path);
        $this->assertNull($burned->fresh()->message);
        $this->assertNull($expired->fresh()->message);
        $this->assertSame(HowlerStatus::Expired, $pastExpiry->fresh()->effectiveStatus());
    }

    /* ---------- status ---------- */

    public function test_the_effective_status_follows_the_expiry_even_before_the_purge(): void
    {
        $this->freezeTime();
        $howler = Howler::factory()->create(['expires_at' => now()->addDay()]);

        $this->assertSame(HowlerStatus::Sealed, $howler->effectiveStatus());
        $this->assertSame(HowlerStatus::Sealed, $howler->effectiveStatus(now()->addDay()->subSecond()));
        $this->assertSame(HowlerStatus::Expired, $howler->effectiveStatus(now()->addDay()));
        // the row itself is still stored as sealed: only the purge changes it
        $this->assertSame(HowlerStatus::Sealed, $howler->fresh()->status);
    }

    public function test_a_burned_howler_stays_burned_after_its_expiry(): void
    {
        $howler = Howler::factory()->burned()->create();

        $this->assertSame(HowlerStatus::Burned, $howler->effectiveStatus(now()->addYear()));
    }

    /* ---------- opening (burn) ---------- */

    public function test_burning_returns_the_content_once_and_deletes_it(): void
    {
        $howler = Howler::factory()->withAudio('howlers/a.wav')->create(['message' => 'Clean your room', 'recipient_name' => 'Ron']);

        $content = $howler->burn();

        $this->assertSame(['message' => 'Clean your room', 'recipient_name' => 'Ron', 'audio_path' => 'howlers/a.wav'], $content);

        $row = (array) DB::table('howlers')->where('id', $howler->id)->first();
        $this->assertSame('burned', $row['status']);
        $this->assertNotNull($row['opened_at']);
        $this->assertNull($row['message']);
        $this->assertNull($row['audio_path']);
    }

    public function test_burning_twice_is_refused(): void
    {
        $howler = Howler::factory()->create();
        $howler->burn();

        $this->expectException(HowlerNotOpenable::class);
        $howler->fresh()->burn();
    }

    public function test_burning_after_the_expiry_is_refused_even_before_the_purge_ran(): void
    {
        $howler = Howler::factory()->pastExpiry()->create(['message' => 'Too late']);

        try {
            $howler->burn();
            $this->fail('an expired howler must not open');
        } catch (HowlerNotOpenable $e) {
            $this->assertSame(HowlerStatus::Expired, $e->status);
        }
        $this->assertSame('Too late', $howler->fresh()->message, 'a refused opening changes nothing');
    }

    /* ---------- expiring (purge) ---------- */

    public function test_expiring_deletes_the_content_and_returns_the_audio_path_to_delete(): void
    {
        $howler = Howler::factory()->withAudio('howlers/b.wav')->pastExpiry()->create();

        $this->assertSame('howlers/b.wav', $howler->expire());

        $row = (array) DB::table('howlers')->where('id', $howler->id)->first();
        $this->assertSame('expired', $row['status']);
        $this->assertNull($row['message']);
        $this->assertNull($row['audio_path']);
        $this->assertNull($row['opened_at']);
    }

    public function test_a_burned_howler_cannot_be_expired(): void
    {
        $howler = Howler::factory()->burned()->create();

        $this->expectException(HowlerNotOpenable::class);
        $howler->expire();
    }

    /* ---------- the database rules, attacked directly ---------- */

    public function test_the_database_refuses_content_on_a_burned_howler(): void
    {
        $howler = Howler::factory()->create();

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('howlers_no_content_after_delivery');
        DB::table('howlers')->where('id', $howler->id)->update(['status' => 'burned', 'opened_at' => now()]);
    }

    public function test_the_database_refuses_a_sealed_howler_without_a_message(): void
    {
        $howler = Howler::factory()->create();

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('howlers_sealed_has_message');
        DB::table('howlers')->where('id', $howler->id)->update(['message' => '   ']);
    }

    public function test_the_database_refuses_an_unknown_status(): void
    {
        $howler = Howler::factory()->create();

        // the content is cleared too, so that only the status rule can complain
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('howlers_status_check');
        DB::table('howlers')->where('id', $howler->id)->update(['status' => 'pending', 'message' => null]);
    }

    public function test_the_database_refuses_an_opening_time_on_a_sealed_howler(): void
    {
        $howler = Howler::factory()->create();

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('howlers_opened_at_only_when_burned');
        DB::table('howlers')->where('id', $howler->id)->update(['opened_at' => now()]);
    }

    public function test_the_database_refuses_a_message_over_140_characters(): void
    {
        $this->expectException(QueryException::class);
        Howler::factory()->create(['message' => str_repeat('a', 141)]);
    }

    public function test_the_database_refuses_a_duplicate_token_hash(): void
    {
        Howler::factory()->withToken('same-token')->create();

        $this->expectException(QueryException::class);
        Howler::factory()->withToken('same-token')->create();
    }
}
