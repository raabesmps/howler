<?php

namespace Tests\Feature;

use App\Models\Howler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitAndReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_is_limited_to_five_per_minute_per_ip(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/howlers', ['message' => "n{$i}"])->assertCreated();
        }

        $this->postJson('/api/howlers', ['message' => 'one too many'])
            ->assertStatus(429)
            ->assertHeader('Retry-After');
        $this->assertDatabaseCount('howlers', 5);
    }

    public function test_the_limit_is_per_ip(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/howlers', ['message' => 'x'])->assertCreated();
        }

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])
            ->postJson('/api/howlers', ['message' => 'another person'])
            ->assertCreated();
    }

    public function test_guessing_tokens_is_limited_too(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/api/howlers/'.Howler::newToken())->assertNotFound();
        }

        $this->getJson('/api/howlers/'.Howler::newToken())->assertStatus(429);
    }

    public function test_a_report_stores_the_reason_and_the_howler_but_not_the_message_or_the_reporter(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Threatening text');

        $this->postJson("/api/howlers/{$token}/report", ['reason' => 'threat'])->assertCreated()->assertExactJson(['reported' => true]);

        $row = (array) \DB::table('howler_reports')->first();
        $this->assertSame($howler->id, $row['howler_id']);
        $this->assertSame('threat', $row['reason']);
        $this->assertSame(['id', 'howler_id', 'reason', 'created_at'], array_keys($row));
    }

    public function test_a_burned_howler_can_still_be_reported(): void
    {
        ['howler' => $howler, 'token' => $token] = Howler::createSealed('Hi');
        $howler->burn();

        $this->postJson("/api/howlers/{$token}/report", ['reason' => 'abuse'])->assertCreated();
    }

    public function test_a_report_needs_a_known_reason_and_a_known_howler(): void
    {
        ['token' => $token] = Howler::createSealed('Hi');

        $this->postJson("/api/howlers/{$token}/report", ['reason' => 'because'])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->postJson("/api/howlers/{$token}/report", [])->assertStatus(422);
        $this->postJson('/api/howlers/'.Howler::newToken().'/report', ['reason' => 'abuse'])->assertNotFound();
        $this->assertDatabaseCount('howler_reports', 0);
    }

    public function test_reporting_is_limited(): void
    {
        ['token' => $token] = Howler::createSealed('Hi');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/api/howlers/{$token}/report", ['reason' => 'spam'])->assertCreated();
        }
        $this->postJson("/api/howlers/{$token}/report", ['reason' => 'spam'])->assertStatus(429);
    }
}
