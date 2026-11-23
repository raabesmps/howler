<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * An abuse report. It holds the reason and the howler id only: no message, no reporter identity.
 *
 * @property int $id
 * @property string|null $howler_id
 * @property string $reason
 */
class HowlerReport extends Model
{
    public const REASONS = ['abuse', 'harassment', 'threat', 'spam', 'other'];

    public const UPDATED_AT = null;

    protected $fillable = ['howler_id', 'reason'];
}
