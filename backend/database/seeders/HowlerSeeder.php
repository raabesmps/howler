<?php

namespace Database\Seeders;

use App\Models\Howler;
use Illuminate\Database\Seeder;

/**
 * Development data with tokens you can type: one howler in each state. It refuses to run in production.
 */
class HowlerSeeder extends Seeder
{
    public const SEALED_TOKEN = 'dev-sealed-token';

    public const BURNED_TOKEN = 'dev-burned-token';

    public const EXPIRED_TOKEN = 'dev-expired-token';

    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('The howler seeder uses fixed, public tokens. It does not run in production.');

            return;
        }

        Howler::factory()->withToken(self::SEALED_TOKEN)->create([
            'recipient_name' => 'Ana',
            'message' => 'You never answer my calls.',
        ]);
        Howler::factory()->withToken(self::BURNED_TOKEN)->burned()->create(['recipient_name' => 'Ana']);
        Howler::factory()->withToken(self::EXPIRED_TOKEN)->expired()->create(['recipient_name' => 'Ana']);

        $this->command?->info('Seeded 3 howlers: tokens '.self::SEALED_TOKEN.', '.self::BURNED_TOKEN.', '.self::EXPIRED_TOKEN.'.');
    }
}
