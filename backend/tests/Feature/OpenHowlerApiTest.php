<?php

namespace Tests\Feature;

use App\Enums\HowlerStatus;
use App\Models\Howler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OpenHowlerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_first_open_returns_the_message_and_burns_the_howler(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('HOW DARE YOU!', 'Ana');

        $this->postJson("/api/howlers/{$token}/open")
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertExactJson(['message' => 'HOW DARE YOU!', 'recipient_name' => 'Ana']);

        $fresh = $howler->fresh();
        $this->assertSame(HowlerStatus::Burned, $fresh->status);
        $this->assertNull($fresh->message);
        $this->assertNotNull($fresh->opened_at);
    }

    public function test_the_second_open_is_410_gone_and_does_not_leak_the_message(): void
    {
        ['token' => $token] = Howler::createSealed('HOW DARE YOU!');

        $this->postJson("/api/howlers/{$token}/open")->assertOk();
        $second = $this->postJson("/api/howlers/{$token}/open")->assertStatus(410)->assertJsonPath('status', 'burned');

        $this->assertStringNotContainsString('HOW DARE', $second->getContent());
    }

    public function test_an_expired_howler_is_410_with_the_expired_status(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Late', null, null, now()->subMinute());

        $this->postJson("/api/howlers/{$token}/open")->assertStatus(410)->assertJsonPath('status', 'expired');
        $this->assertSame('Late', $howler->fresh()->message, 'a refused opening must not touch the row (the purge does that)');
    }

    public function test_an_unknown_token_is_404(): void
    {
        $this->postJson('/api/howlers/'.Howler::newToken().'/open')->assertNotFound();
    }

    public function test_opening_with_a_get_is_not_allowed_so_link_previews_cannot_burn_it(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hi');

        $this->getJson("/api/howlers/{$token}/open")->assertStatus(405);
        $this->assertSame(HowlerStatus::Sealed, $howler->fresh()->status);
    }

    public function test_the_audio_file_is_deleted_after_the_open(): void
    {
        Storage::fake();
        Storage::put('howlers/a.mp3', 'voice');
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hi');
        $howler->forceFill(['audio_path' => 'howlers/a.mp3'])->save();

        $this->postJson("/api/howlers/{$token}/open")->assertOk();

        Storage::assertMissing('howlers/a.mp3');
        $this->assertNull($howler->fresh()->audio_path);
    }
}
