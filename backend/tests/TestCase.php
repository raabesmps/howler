<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // No test may ever reach the real OpenAI API (it costs money). Tests that need it fake it explicitly.
        Http::preventStrayRequests();

        // The developer's real key may be in the environment (docker compose reads .env.local): tests never use it.
        config(['services.openai.key' => null]);
    }
}
