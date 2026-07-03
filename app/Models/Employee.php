<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $nik
 * @property string $name
 * @property string|null $position
 * @property string|null $pg
 * @property string|null $unit
 * @property Carbon|null $skp_expired
 * @property string|null $function_category
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['nik', 'name', 'position', 'pg', 'unit', 'skp_expired', 'function_category'])]
class Employee extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'skp_expired' => 'date',
        ];
    }
}
