<?php

namespace Tests\Unit;

use App\Models\Howler;
use App\Support\SentryScrubber;
use PHPUnit\Framework\TestCase;
use Sentry\Breadcrumb;
use Sentry\Event;
use Sentry\ExceptionDataBag;
use Sentry\UserDataBag;

class SentryScrubberTest extends TestCase
{
    private const MESSAGE = 'RONALD WEASLEY HOW DARE YOU';

    private function eventWith(string $token): Event
    {
        $event = Event::createEvent();
        $event->setRequest([
            'method' => 'POST',
            'url' => "https://howler.example.com/api/howlers/{$token}/open?ref=abc#frag",
            'query_string' => "t={$token}",
            'headers' => ['Cookie' => 'session=secret', 'X-Forwarded-For' => '203.0.113.9'],
            'cookies' => ['a' => 'b'],
            'data' => ['message' => self::MESSAGE],
            'env' => ['REMOTE_ADDR' => '203.0.113.9'],
        ]);
        $event->setUser(UserDataBag::createFromUserIpAddress('203.0.113.9'));
        $event->setTransaction("/api/howlers/{$token}/open");
        $event->setMessage("could not open {$token}");
        $event->setExceptions([new ExceptionDataBag(new \RuntimeException("No query results for token {$token}"))]);
        $event->setBreadcrumb([new Breadcrumb(Breadcrumb::LEVEL_INFO, Breadcrumb::TYPE_DEFAULT, 'sql', "select * from howlers where token_hash = '{$token}'")]);
        $event->setExtra(['message' => self::MESSAGE, 'token' => $token]);

        return $event;
    }

    public function test_nothing_secret_survives_in_any_part_of_the_report(): void
    {
        $token = Howler::newToken();

        $clean = SentryScrubber::beforeSend($this->eventWith($token));

        $everything = json_encode([
            $clean->getRequest(),
            $clean->getUser(),
            $clean->getTransaction(),
            $clean->getMessage(),
            array_map(fn ($e) => $e->getValue(), $clean->getExceptions()),
            $clean->getBreadcrumbs(),
            $clean->getExtra(),
        ]);
        $this->assertStringNotContainsString($token, $everything);
        $this->assertStringNotContainsString(self::MESSAGE, $everything);
        $this->assertStringNotContainsString('203.0.113.9', $everything);
        $this->assertStringNotContainsString('session=secret', $everything);
    }

    public function test_what_finds_the_bug_is_kept(): void
    {
        $clean = SentryScrubber::beforeSend($this->eventWith(Howler::newToken()));

        $this->assertSame('POST', $clean->getRequest()['method']);
        $this->assertSame('https://howler.example.com/api/howlers/[token]/open', $clean->getRequest()['url']);
        $this->assertSame('/api/howlers/[token]/open', $clean->getTransaction());
        $this->assertSame('No query results for token [token]', $clean->getExceptions()[0]->getValue());
        $this->assertSame(\RuntimeException::class, $clean->getExceptions()[0]->getType());
    }

    public function test_the_event_is_never_dropped(): void
    {
        $this->assertInstanceOf(Event::class, SentryScrubber::beforeSend(Event::createEvent()));
    }

    public function test_urls_lose_query_and_fragment_and_text_loses_any_token_shape(): void
    {
        $token = Howler::newToken();

        $this->assertSame('https://x.test/api/howlers/[token]', SentryScrubber::url("https://x.test/api/howlers/{$token}?a=1#b"));
        $this->assertSame("seen [token] and [token], not 'short-text'", SentryScrubber::text("seen {$token} and ".Howler::newToken().", not 'short-text'"));
        $this->assertSame('/api/howlers', SentryScrubber::url('/api/howlers'));
    }

    public function test_a_real_token_is_always_22_characters_so_the_pattern_catches_all_of_them(): void
    {
        for ($i = 0; $i < 200; $i++) {
            $this->assertSame(22, strlen(Howler::newToken()));
        }
    }

    public function test_the_configuration_uses_the_scrubber_and_sends_no_personal_data(): void
    {
        $config = require __DIR__.'/../../config/sentry.php';

        $this->assertSame([SentryScrubber::class, 'beforeSend'], $config['before_send']);
        $this->assertSame([SentryScrubber::class, 'beforeSend'], $config['before_send_transaction']);
        $this->assertFalse($config['send_default_pii']);
        $this->assertSame('never', $config['max_request_body_size']);
        $this->assertFalse($config['breadcrumbs']['sql_queries']);
        $this->assertFalse($config['breadcrumbs']['cache']);
        $this->assertNull($config['dsn'] ?? null, 'off unless a DSN is set in the environment');
    }
}
