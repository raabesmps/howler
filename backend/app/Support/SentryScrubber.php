<?php

namespace App\Support;

use Sentry\Event;
use Sentry\EventHint;

/**
 * What may leave this server in an error report.
 *
 * Error monitoring must never become a leak of the product's secrets, and this product has two: the link token (anyone
 * who holds it can open the howler) and the message (it is deleted on purpose). Both can end up in the places an error
 * tool likes to collect: the request URL (the token is in its path), the request body (the message), exception messages,
 * breadcrumbs and the user's IP address. So the report is cut down to what is needed to find the bug:
 * the exception, its stack trace, the route and the method.
 *
 * Wired in config/sentry.php as the before_send hook, so it runs for every event, errors and transactions alike.
 */
class SentryScrubber
{
    public const TOKEN = '[token]';

    /** A token is 16 random bytes as URL-safe base64 without padding: 22 characters (links made before v1.1.0 have 43). */
    private const TOKEN_SHAPE = '/(?<![A-Za-z0-9_-])(?:[A-Za-z0-9_-]{43}|[A-Za-z0-9_-]{22})(?![A-Za-z0-9_-])/';

    private const ROUTE_TOKEN = '#/api/howlers/[^/?\#\s]+#';

    public static function beforeSend(Event $event, ?EventHint $hint = null): ?Event
    {
        // only the method and the path (with the token blanked) survive of the request: no headers, cookies, query
        // string, body or client address
        $request = $event->getRequest();
        $kept = [];
        if (isset($request['method']) && is_string($request['method'])) {
            $kept['method'] = $request['method'];
        }
        if (isset($request['url']) && is_string($request['url'])) {
            $kept['url'] = self::url($request['url']);
        }
        $event->setRequest($kept);

        $event->setUser(null);
        $event->setBreadcrumb([]);
        $event->setExtra([]);

        if ($event->getTransaction() !== null) {
            $event->setTransaction(self::text($event->getTransaction()));
        }
        if ($event->getMessage() !== null) {
            $event->setMessage(self::text($event->getMessage()));
        }
        foreach ($event->getExceptions() as $exception) {
            $exception->setValue(self::text($exception->getValue()));
        }

        return $event;
    }

    /** A request URL: the host and path stay, the token, the query string and the fragment go. */
    public static function url(string $url): string
    {
        $url = preg_replace('/[?#].*$/', '', $url) ?? '';

        return self::text($url);
    }

    /** Any free text (an exception message, a transaction name): blank every token in it. */
    public static function text(string $text): string
    {
        $text = preg_replace(self::ROUTE_TOKEN, '/api/howlers/'.self::TOKEN, $text) ?? $text;

        return preg_replace(self::TOKEN_SHAPE, self::TOKEN, $text) ?? $text;
    }
}
