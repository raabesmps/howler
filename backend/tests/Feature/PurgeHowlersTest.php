<?php

namespace Tests\Feature;

use App\Enums\HowlerStatus;
use App\Models\Howler;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PurgeHowlersTest extends TestCase
{
    use RefreshDatabase;

    public function test_overdue_howlers_expire_and_lose_message_and_audio(): void
    {
        Storage::fake();
        Storage::put('howlers/old.mp3', 'voice');
        ['howler' => $overdue] = Howler::createSealed('Too late', 'Ana', null, now()->subMinute());
        $overdue->forceFill(['audio_path' => 'howlers/old.mp3'])->save();
        ['howler' => $fresh] = Howler::createSealed('Still good');

        $this->artisan('howlers:purge')->assertSuccessful();

        $overdue = $overdue->fresh();
        $this->assertSame(HowlerStatus::Expired, $overdue->status);
        $this->assertNull($overdue->message);
        $this->assertNull($overdue->audio_path);
        $this->assertNull($overdue->recipient_name);
        Storage::assertMissing('howlers/old.mp3');
        $this->assertSame('Still good', $fresh->fresh()->message);
    }

    public function test_tombstones_are_kept_for_30_days_then_deleted(): void
    {
        ['howler' => $recent] = Howler::createSealed('a');
        $recent->burn(now()->subDays(29));
        ['howler' => $old] = Howler::createSealed('b');
        $old->burn(now()->subDays(31));
        ['howler' => $oldExpired] = Howler::createSealed('c', null, null, now()->subDays(40));
        $oldExpired->expire();
        $oldExpired->forceFill(['updated_at' => now()->subDays(31)])->saveQuietly();

        $this->artisan('howlers:purge')->assertSuccessful();

        $this->assertNotNull($recent->fresh());
        $this->assertNull($old->fresh());
        $this->assertNull($oldExpired->fresh());
    }

    public function test_a_purged_tombstone_makes_the_link_a_404(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('a');
        $howler->burn(now()->subDays(31));

        $this->getJson("/api/howlers/{$token}")->assertOk()->assertJsonPath('status', 'burned');
        $this->artisan('howlers:purge');
        $this->getJson("/api/howlers/{$token}")->assertNotFound();
    }

    public function test_reports_survive_the_content_but_lose_the_howler_id_with_the_tombstone(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('a');
        $this->postJson("/api/howlers/{$token}/report", ['reason' => 'abuse'])->assertCreated();
        $howler->burn(now()->subDays(31));

        $this->artisan('howlers:purge');

        $this->assertDatabaseCount('howler_reports', 1);
        $this->assertDatabaseHas('howler_reports', ['howler_id' => null, 'reason' => 'abuse']);
    }

    public function test_orphaned_audio_is_deleted_but_wanted_and_recent_files_stay(): void
    {
        Storage::fake();
        ['howler' => $sealed] = Howler::createSealed('a');
        Storage::put('howlers/wanted.mp3', 'x');
        $sealed->forceFill(['audio_path' => 'howlers/wanted.mp3'])->save();
        Storage::put('howlers/orphan.mp3', 'x');
        touch(Storage::path('howlers/orphan.mp3'), now()->subHours(2)->getTimestamp());
        touch(Storage::path('howlers/wanted.mp3'), now()->subHours(2)->getTimestamp());
        Storage::put('howlers/just-created.mp3', 'x');

        $this->artisan('howlers:purge')->assertSuccessful();

        Storage::assertMissing('howlers/orphan.mp3');
        Storage::assertExists('howlers/wanted.mp3');
        Storage::assertExists('howlers/just-created.mp3');
    }

    public function test_the_purge_is_scheduled_hourly(): void
    {
        $event = collect(app(Schedule::class)->events())->first(fn ($e) => str_contains($e->command, 'howlers:purge'));

        $this->assertNotNull($event);
        $this->assertSame('0 * * * *', $event->expression);
    }
}
