<?php

namespace Tests\Feature;

use App\Enums\HowlerStatus;
use App\Models\Howler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HowlerStatusApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_sealed_howler_reports_its_state_and_name_but_never_the_message(): void
    {
        ['token' => $token] = Howler::createSealed('A secret scream.', 'Ana');

        $response = $this->getJson("/api/howlers/{$token}")->assertOk();

        $response->assertExactJson(['status' => 'sealed', 'recipient_name' => 'Ana']);
        $this->assertStringNotContainsString('secret', $response->getContent());
    }

    public function test_looking_at_the_state_does_not_burn_it(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hi');

        $this->getJson("/api/howlers/{$token}")->assertOk();
        $this->getJson("/api/howlers/{$token}")->assertOk()->assertJsonPath('status', 'sealed');

        $this->assertSame(HowlerStatus::Sealed, $howler->fresh()->status);
        $this->assertSame('Hi', $howler->fresh()->message);
    }

    public function test_a_burned_howler_reports_burned_without_a_name(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hi', 'Ana');
        $howler->burn();

        $this->getJson("/api/howlers/{$token}")->assertOk()->assertExactJson(['status' => 'burned', 'recipient_name' => null]);
    }

    public function test_a_howler_past_its_expiry_reports_expired_before_the_purge_runs(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hi', 'Ana', null, now()->subMinute());
        $this->assertSame(HowlerStatus::Sealed, $howler->fresh()->status);

        $this->getJson("/api/howlers/{$token}")->assertOk()->assertExactJson(['status' => 'expired', 'recipient_name' => null]);
    }

    public function test_an_unknown_token_is_a_404_and_the_response_is_not_cacheable(): void
    {
        $this->getJson('/api/howlers/'.Howler::newToken())->assertNotFound()->assertHeader('Cache-Control', 'no-store, private');
    }
}
