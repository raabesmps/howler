<?php

namespace Tests\Feature;

use Tests\TestCase;

class RootRouteTest extends TestCase
{
    public function test_the_root_says_what_this_is(): void
    {
        $this->get('/')->assertOk()->assertExactJson(['name' => 'howler-api']);
    }
}
