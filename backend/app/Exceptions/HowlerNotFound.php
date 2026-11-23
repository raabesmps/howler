<?php

namespace App\Exceptions;

use RuntimeException;

/** No howler has this token (never existed, or its tombstone was purged). The API answers it with 404. */
class HowlerNotFound extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('This howler does not exist.');
    }
}
