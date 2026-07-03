<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportEmployeesRequest;
use App\Models\Employee;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use SimpleXMLElement;
use ZipArchive;

class EmployeeController extends Controller
{
    public function index(Request $request): Response
    {
        $unit = Str::of($request->string('unit')->toString())->lower()->toString();
        $unit = in_array($unit, ['teknik', 'avsek', 'pkpk'], true) ? $unit : null;

        $employees = Employee::query()
            ->when($unit, fn ($query) => $query->where('unit', $unit))
            ->orderBy('id')
            ->get()
            ->map(fn (Employee $employee): array => [
                'id' => $employee->id,
                'nik' => $employee->nik,
                'name' => $employee->name,
                'position' => $employee->position,
                'pg' => $employee->pg,
                'unit' => $employee->unit,
                'unit_label' => $employee->unit ? Str::of($employee->unit)->upper()->toString() : null,
                'skp_expired' => $employee->skp_expired?->format('Y-m-d'),
                'function_category' => $employee->function_category,
            ]);

        return Inertia::render('welcome', [
            'employees' => $employees,
            'filters' => [
                'unit' => $unit,
            ],
        ]);
    }

    public function store(ImportEmployeesRequest $request): RedirectResponse
    {
        $file = $request->file('employees_file');
        $rows = $this->readEmployeeRows($file->getRealPath(), $file->getClientOriginalExtension());

        foreach ($rows as $row) {
            Employee::query()->updateOrCreate(
                ['nik' => $row['nik']],
                Arr::except($row, ['nik']),
            );
        }

        return back()->with('success', count($rows).' data karyawan berhasil diupload.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $employee->delete();

        return back()->with('success', 'Data karyawan berhasil dihapus.');
    }

    /**
     * @return array<int, array{nik: string, name: string, position: ?string, pg: ?string, unit: ?string, skp_expired: ?CarbonImmutable, function_category: ?string}>
     */
    private function readEmployeeRows(string $path, string $extension): array
    {
        $tableRows = Str::of($extension)->lower()->toString() === 'xlsx'
            ? $this->readXlsxTableRows($path)
            : $this->readCsvTableRows($path);

        if ($tableRows === []) {
            throw ValidationException::withMessages([
                'employees_file' => 'File data karyawan kosong.',
            ]);
        }

        $headers = array_map(fn (?string $header): string => $this->normalizeHeader((string) $header), $tableRows[0]);
        $columns = $this->mapColumns($headers);
        $rows = [];

        foreach (array_slice($tableRows, 1) as $lineNumber => $values) {
            if (collect($values)->every(fn (?string $value): bool => trim((string) $value) === '')) {
                continue;
            }

            $nik = $this->cellValue($values, $columns['nik']);
            $name = $this->cellValue($values, $columns['name']);

            if ($nik === null || $name === null) {
                throw ValidationException::withMessages([
                    'employees_file' => 'Baris '.($lineNumber + 2).' wajib memiliki NIK dan nama.',
                ]);
            }

            $unit = $this->cellValue($values, $columns['unit'] ?? null);

            $rows[] = [
                'nik' => $nik,
                'name' => $name,
                'position' => $this->cellValue($values, $columns['position'] ?? null),
                'pg' => $this->cellValue($values, $columns['pg'] ?? null),
                'unit' => $unit ? Str::of($unit)->lower()->toString() : null,
                'skp_expired' => $this->parseDate($this->cellValue($values, $columns['skp_expired'] ?? null), $lineNumber + 2),
                'function_category' => $this->cellValue($values, $columns['function_category'] ?? null),
            ];
        }

        if ($rows === []) {
            throw ValidationException::withMessages([
                'employees_file' => 'File data karyawan tidak memiliki baris data.',
            ]);
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string|null>>
     */
    private function readCsvTableRows(string $path): array
    {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            return [];
        }

        $delimiter = isset($lines[0]) && substr_count($lines[0], ';') > substr_count($lines[0], ',') ? ';' : ',';

        return array_map(fn (string $line): array => str_getcsv($line, $delimiter), $lines);
    }

    /**
     * @return array<int, array<int, string|null>>
     */
    private function readXlsxTableRows(string $path): array
    {
        $zip = new ZipArchive;

        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages([
                'employees_file' => 'File XLSX tidak bisa dibuka.',
            ]);
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');

        if ($sheetXml === false) {
            $zip->close();

            throw ValidationException::withMessages([
                'employees_file' => 'File XLSX harus memiliki sheet pertama berisi data karyawan.',
            ]);
        }

        $sharedStrings = $this->readSharedStrings($zip);
        $zip->close();

        $sheet = simplexml_load_string($sheetXml);

        if (! $sheet instanceof SimpleXMLElement) {
            throw ValidationException::withMessages([
                'employees_file' => 'Sheet XLSX tidak bisa dibaca.',
            ]);
        }

        $rows = [];

        foreach ($sheet->sheetData->row as $row) {
            $values = [];

            foreach ($row->c as $cell) {
                $cellReference = (string) $cell['r'];
                $columnIndex = $this->columnIndexFromCellReference($cellReference);
                $values[$columnIndex] = $this->xlsxCellValue($cell, $sharedStrings);
            }

            if ($values !== []) {
                ksort($values);
                $rows[] = $this->fillMissingCells($values);
            }
        }

        return $rows;
    }

    /**
     * @return array<int, string>
     */
    private function readSharedStrings(ZipArchive $zip): array
    {
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');

        if ($sharedStringsXml === false) {
            return [];
        }

        $sharedStrings = simplexml_load_string($sharedStringsXml);

        if (! $sharedStrings instanceof SimpleXMLElement) {
            return [];
        }

        $values = [];

        foreach ($sharedStrings->si as $item) {
            if (isset($item->t)) {
                $values[] = (string) $item->t;

                continue;
            }

            $text = '';

            foreach ($item->r as $run) {
                $text .= (string) $run->t;
            }

            $values[] = $text;
        }

        return $values;
    }

    /**
     * @param  array<int, string>  $headers
     * @return array<string, int>
     */
    private function mapColumns(array $headers): array
    {
        $aliases = [
            'nik' => 'nik',
            'nama' => 'name',
            'name' => 'name',
            'jabatan' => 'position',
            'position' => 'position',
            'pg' => 'pg',
            'unit' => 'unit',
            'skpexpired' => 'skp_expired',
            'skpberakhir' => 'skp_expired',
            'fungsi' => 'function_category',
            'kategori' => 'function_category',
            'function' => 'function_category',
        ];

        $columns = [];

        foreach ($headers as $index => $header) {
            if (array_key_exists($header, $aliases)) {
                $columns[$aliases[$header]] = $index;
            }
        }

        foreach (['nik', 'name'] as $requiredColumn) {
            if (! array_key_exists($requiredColumn, $columns)) {
                throw ValidationException::withMessages([
                    'employees_file' => 'Header file wajib memiliki kolom NIK dan Nama.',
                ]);
            }
        }

        return $columns;
    }

    private function normalizeHeader(string $header): string
    {
        return Str::of($header)
            ->replace("\u{FEFF}", '')
            ->lower()
            ->replaceMatches('/[^a-z0-9]/', '')
            ->toString();
    }

    /**
     * @param  array<int, string|null>  $values
     */
    private function cellValue(array $values, ?int $index): ?string
    {
        if ($index === null || ! array_key_exists($index, $values)) {
            return null;
        }

        $value = trim((string) $values[$index]);

        return $value === '' ? null : $value;
    }

    /**
     * @param  array<int, string>  $sharedStrings
     */
    private function xlsxCellValue(SimpleXMLElement $cell, array $sharedStrings): ?string
    {
        $type = (string) $cell['t'];

        if ($type === 's') {
            $index = (int) $cell->v;

            return $sharedStrings[$index] ?? null;
        }

        if ($type === 'inlineStr') {
            return (string) ($cell->is->t ?? '');
        }

        if (isset($cell->v)) {
            return (string) $cell->v;
        }

        return null;
    }

    private function columnIndexFromCellReference(string $cellReference): int
    {
        $letters = preg_replace('/[^A-Z]/', '', strtoupper($cellReference)) ?: 'A';
        $index = 0;

        foreach (str_split($letters) as $letter) {
            $index = ($index * 26) + (ord($letter) - 64);
        }

        return $index - 1;
    }

    /**
     * @param  array<int, string|null>  $values
     * @return array<int, string|null>
     */
    private function fillMissingCells(array $values): array
    {
        if ($values === []) {
            return [];
        }

        $keys = array_keys($values);
        $lastIndex = max($keys);
        $row = [];

        for ($index = 0; $index <= $lastIndex; $index++) {
            $row[$index] = $values[$index] ?? null;
        }

        return $row;
    }

    private function parseDate(?string $value, int $lineNumber): ?CarbonImmutable
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            return CarbonImmutable::create(1899, 12, 30)->addDays((int) $value)->startOfDay();
        }

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y'] as $format) {
            try {
                $date = CarbonImmutable::createFromFormat($format, $value);
            } catch (\Throwable) {
                continue;
            }

            if ($date !== null && $date->format($format) === $value) {
                return $date->startOfDay();
            }
        }

        throw ValidationException::withMessages([
            'employees_file' => 'Format SKP expired pada baris '.$lineNumber.' harus YYYY-MM-DD, DD/MM/YYYY, atau DD-MM-YYYY.',
        ]);
    }
}