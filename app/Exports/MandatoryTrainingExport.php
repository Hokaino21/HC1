<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

class MandatoryTrainingExport implements FromArray, WithTitle
{
    public function __construct(
        protected array $data,
        protected string $title
    ) {}

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
