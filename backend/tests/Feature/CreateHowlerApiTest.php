<?php

namespace Tests\Feature;

use App\Enums\HowlerStatus;
use App\Models\Howler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CreateHowlerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_howler_and_returns_the_token_once(): void
    {
        $response = $this->postJson('/api/howlers', ['message' => 'You never answer my calls.', 'recipient_name' => 'Ana']);

        $response->assertCreated()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonStructure(['token', 'recipient_name', 'expires_at'])
            ->assertJsonPath('recipient_name', 'Ana')
            ->assertJsonMissingPath('id')
            ->assertJsonMissingPath('message');

        $howler = Howler::findByToken($response->json('token'));
        $this->assertNotNull($howler);
        $this->assertSame(HowlerStatus::Sealed, $howler->status);
        $this->assertSame('You never answer my calls.', $howler->message);
    }

    public function test_the_recipient_name_is_optional(): void
    {
        $this->postJson('/api/howlers', ['message' => 'Hello'])->assertCreated()->assertJsonPath('recipient_name', null);
    }

    public function test_it_accepts_exactly_140_characters_including_multibyte_ones(): void
    {
        $this->postJson('/api/howlers', ['message' => str_repeat('ã', 140)])->assertCreated();
    }

    #[DataProvider('invalidPayloads')]
    public function test_it_rejects_invalid_input(array $payload, string $field): void
    {
        $this->postJson('/api/howlers', $payload)->assertStatus(422)->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('howlers', 0);
    }

    public static function invalidPayloads(): array
    {
        return [
            'missing message' => [[], 'message'],
            'empty message' => [['message' => ''], 'message'],
            'blank message' => [['message' => "   \n "], 'message'],
            'too long' => [['message' => str_repeat('a', 141)], 'message'],
            'message is an array' => [['message' => ['a']], 'message'],
            'name too long' => [['message' => 'ok', 'recipient_name' => str_repeat('a', 41)], 'recipient_name'],
        ];
    }

    public function test_errors_are_json_even_without_an_accept_header(): void
    {
        $this->post('/api/howlers', [], ['Accept' => '*/*'])->assertStatus(422)->assertJsonStructure(['message', 'errors']);
    }
}
