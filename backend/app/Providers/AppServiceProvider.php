<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Per-IP limits. Creating is the strict one: from CP8 each created howler costs a voice generation, so this limit
     * also caps the spend. The numbers are deliberately plain; they can move without touching the code that uses them.
     */
    private function configureRateLimiting(): void
    {
        $perIp = fn (Request $request): string => (string) $request->ip();

        RateLimiter::for('create-howler', fn (Request $request) => [
            Limit::perMinute(5)->by($perIp($request)),
            Limit::perDay(40)->by($perIp($request)),
        ]);

        // Opening and checking are cheap, but guessing tokens must not be free either.
        RateLimiter::for('howler-access', fn (Request $request) => Limit::perMinute(30)->by($perIp($request)));

        RateLimiter::for('report-howler', fn (Request $request) => Limit::perMinute(5)->by($perIp($request)));
    }
}
