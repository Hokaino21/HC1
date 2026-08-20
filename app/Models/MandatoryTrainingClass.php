<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $function_category
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'function_category',
])]
class MandatoryTrainingClass extends Model
{
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'mandatory_training_class_id');
    }
}
