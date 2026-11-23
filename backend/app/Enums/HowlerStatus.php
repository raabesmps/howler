<?php

namespace App\Enums;

enum HowlerStatus: string
{
    /** Created and waiting: the content exists and nobody has opened it. */
    case Sealed = 'sealed';

    /** Opened once. The content is gone for good. */
    case Burned = 'burned';

    /** Nobody opened it before it expired. The content is gone for good. */
    case Expired = 'expired';
}
