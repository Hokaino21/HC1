<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * @phpstan-type ExportData array<int, array<int, string>>
 */
class MandatoryTrainingExport implements FromArray, WithTitle
{
    /**
     * @param  ExportData  $data
     */
    public function __construct(
        protected array $data,
        protected string $title
    ) {}

    /**
     * @return ExportData
     */
    public function array(): array
    {
        return [
            [$this->title],
            [],
            ['No', 'NIK', 'Nama', 'SKP Expired', 'Fungsi'],
            ...$this->data,
        ];
    }

    public function title(): string
    {
        return $this->title;
    }
}
