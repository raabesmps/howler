<?php

namespace Tests\Feature;

use App\Models\Howler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_api_answer_carries_the_security_headers(): void
    {
        ['token' => $token] = Howler::createSealed('Hi');

        foreach ([
            $this->postJson('/api/howlers', ['message' => 'Hi']),
            $this->getJson("/api/howlers/{$token}"),
            $this->postJson("/api/howlers/{$token}/open"),
            $this->getJson('/api/howlers/'.Howler::newToken()), // a 404
            $this->postJson('/api/howlers', []),               // a 422
        ] as $response) {
            $response->assertHeader('X-Content-Type-Options', 'nosniff')
                ->assertHeader('Referrer-Policy', 'no-referrer')
                ->assertHeader('Cross-Origin-Resource-Policy', 'same-origin')
                ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        }
    }

    public function test_a_foreign_origin_gets_no_cors_permission_by_default(): void
    {
        $preflight = $this->call('OPTIONS', '/api/howlers', [], [], [], [
            'HTTP_ORIGIN' => 'https://evil.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type',
        ]);
        $this->assertFalse($preflight->headers->has('Access-Control-Allow-Origin'));

        $real = $this->postJson('/api/howlers', ['message' => 'Hi'], ['Origin' => 'https://evil.example']);
        $this->assertFalse($real->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_an_origin_in_the_allow_list_is_let_in_and_only_that_one(): void
    {
        config(['cors.allowed_origins' => ['https://app.example']]);

        $allowed = $this->postJson('/api/howlers', ['message' => 'Hi'], ['Origin' => 'https://app.example']);
        $this->assertSame('https://app.example', $allowed->headers->get('Access-Control-Allow-Origin'));
        $this->assertFalse($allowed->headers->has('Access-Control-Allow-Credentials'));

        $other = $this->postJson('/api/howlers', ['message' => 'Hi'], ['Origin' => 'https://evil.example']);
        $this->assertNotSame('https://evil.example', $other->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_the_allow_list_comes_from_the_environment_as_a_comma_separated_list(): void
    {
        $this->assertSame([], config('cors.allowed_origins'), 'closed by default');
    }
}
