<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $employee_id
 * @property string|null $nik
 * @property string|null $name
 * @property string|null $place_of_birth
 * @property Carbon|null $date_of_birth
 * @property string|null $gender
 * @property string|null $position
 * @property string|null $pg
 * @property string|null $unit
 * @property string|null $location
 * @property Carbon|null $skp_expired
 * @property string|null $function_category
 * @property string|null $sub_license
 * @property string|null $training_schedule
 * @property string $avsec_category
 * @property string|null $photo_jpg
 * @property string|null $ktp_pdf
 * @property string|null $competency_certificate
 * @property string|null $latest_certificate
 * @property string|null $latest_education_certificate
 * @property string|null $license_book
 * @property string|null $curriculum_vitae
 * @property string|null $skck
 * @property string|null $background_check
 * @property string|null $whatsapp_number
 * @property Carbon $archived_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'employee_id',
    'nik',
    'name',
    'place_of_birth',
    'date_of_birth',
    'gender',
    'position',
    'pg',
    'unit',
    'location',
    'skp_expired',
    'function_category',
    'sub_license',
    'training_schedule',
    'avsec_category',
    'photo_jpg',
    'ktp_pdf',
    'competency_certificate',
    'latest_certificate',
    'latest_education_certificate',
    'license_book',
    'curriculum_vitae',
    'skck',
    'background_check',
    'whatsapp_number',
    'archived_at',
])]
class EmployeeAvsecArchive extends Model
{
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'skp_expired' => 'date',
            'archived_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
