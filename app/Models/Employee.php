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
 * @property string|null $location
 * @property Carbon|null $skp_expired
 * @property string|null $function_category
 * @property string|null $photo_jpg
 * @property string|null $ktp_pdf
 * @property string|null $initial_avsec_competency_certificate
 * @property string|null $latest_refresher_certificate
 * @property string|null $latest_education_certificate
 * @property string|null $license_book
 * @property string|null $curriculum_vitae
 * @property string|null $skck
 * @property string|null $background_check
 * @property string|null $whatsapp_number
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'nik',
    'name',
    'position',
    'pg',
    'unit',
    'location',
    'skp_expired',
    'function_category',
    'photo_jpg',
    'ktp_pdf',
    'initial_avsec_competency_certificate',
    'latest_refresher_certificate',
    'latest_education_certificate',
    'license_book',
    'curriculum_vitae',
    'skck',
    'background_check',
    'whatsapp_number',
])]
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
