<?php

namespace App\Exceptions;

use App\Enums\HowlerStatus;
use DomainException;

/** The howler cannot make this transition: it was already burned or it has expired. The API answers it with 410 Gone (CP7). */
class HowlerNotOpenable extends DomainException
{
    public function __construct(public readonly HowlerStatus $status)
    {
        parent::__construct("The howler is {$status->value}.");
    }
}
