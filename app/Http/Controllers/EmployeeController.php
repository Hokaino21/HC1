<?php

namespace App\Http\Controllers;

use App\Exports\MandatoryTrainingExport;
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
use Maatwebsite\Excel\Facades\Excel;
use SimpleXMLElement;
use ZipArchive;

class EmployeeController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const EMPLOYEE_DOCUMENT_COLUMNS = [
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
    ];

    public function index(Request $request): Response
    {
        $unit = Str::of($request->string('unit')->toString())->lower()->toString();
        $unit = in_array($unit, ['teknik', 'avsek', 'pkpk'], true) ? $unit : null;

        $employees = Employee::query()
            ->when($unit, fn ($query) => $query->where(fn ($query) => $query
                ->whereRaw('LOWER(unit) = ?', [$unit])
                ->orWhereRaw('LOWER(function_category) = ?', [$unit])
            ))
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
                ...$this->employeeDocumentData($employee),
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

    public function update(Employee $employee, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nik' => 'required|string',
            'name' => 'required|string',
            'position' => 'nullable|string',
            'pg' => 'nullable|string',
            'unit' => 'nullable|string',
            'skp_expired' => 'nullable|date',
            'function_category' => 'nullable|string',
            'photo_jpg' => 'nullable|string',
            'ktp_pdf' => 'nullable|string',
            'initial_avsec_competency_certificate' => 'nullable|string',
            'latest_refresher_certificate' => 'nullable|string',
            'latest_education_certificate' => 'nullable|string',
            'license_book' => 'nullable|string',
            'curriculum_vitae' => 'nullable|string',
            'skck' => 'nullable|string',
            'background_check' => 'nullable|string',
            'whatsapp_number' => 'nullable|string',
        ]);

        $employee->update($validated);

        return back()->with('success', 'Data karyawan berhasil diperbarui.');
    }

    public function exportMandatoryTraining(Request $request)
    {
        $validated = $request->validate([
            'batch_name' => 'required|string',
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'integer|exists:employees,id',
        ]);

        $employees = Employee::whereIn('id', $validated['employee_ids'])->get();

        $data = $employees->map(function (Employee $employee, int $index) {
            return [
                $index + 1,
                $employee->nik,
                $employee->name,
                $employee->skp_expired?->format('Y-m-d') ?? '',
                $employee->function_category ?? '',
            ];
        })->toArray();

        return Excel::download(
            new MandatoryTrainingExport($data, $validated['batch_name']),
            Str::slug($validated['batch_name']) . '.xlsx'
        );
    }

    /**
     * @return array<int, array<string, CarbonImmutable|string|null>>
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
                ...$this->employeeDocumentCellValues($values, $columns),
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
     * @return array<string, string|null>
     */
    private function employeeDocumentData(Employee $employee): array
    {
        return collect(self::EMPLOYEE_DOCUMENT_COLUMNS)
            ->mapWithKeys(fn (string $column): array => [$column => $employee->{$column}])
            ->all();
    }

    /**
     * @param  array<int, string|null>  $values
     * @param  array<string, int>  $columns
     * @return array<string, string|null>
     */
    private function employeeDocumentCellValues(array $values, array $columns): array
    {
        return collect(self::EMPLOYEE_DOCUMENT_COLUMNS)
            ->mapWithKeys(fn (string $column): array => [$column => $this->cellValue($values, $columns[$column] ?? null)])
            ->all();
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
        $sheet = simplexml_load_string($sheetXml);

        if (! $sheet instanceof SimpleXMLElement) {
            $zip->close();

            throw ValidationException::withMessages([
                'employees_file' => 'Sheet XLSX tidak bisa dibaca.',
            ]);
        }

        $hyperlinks = $this->readWorksheetHyperlinks($zip, $sheet);
        $zip->close();

        $rows = [];

        foreach ($sheet->sheetData->row as $row) {
            $values = [];

            foreach ($row->c as $cell) {
                $cellReference = (string) $cell['r'];
                $columnIndex = $this->columnIndexFromCellReference($cellReference);
                $values[$columnIndex] = $this->xlsxCellValue($cell, $sharedStrings, $hyperlinks);
            }

            if ($values !== []) {
                ksort($values);
                $rows[] = $this->fillMissingCells($values);
            }
        }

        return $rows;
    }

    /**
     * @return array<string, string>
     */
    private function readWorksheetHyperlinks(ZipArchive $zip, SimpleXMLElement $sheet): array
    {
        if (! isset($sheet->hyperlinks)) {
            return [];
        }

        $relationships = $this->readWorksheetRelationships($zip);
        $hyperlinks = [];

        foreach ($sheet->hyperlinks->hyperlink as $hyperlink) {
            $reference = (string) $hyperlink['ref'];
            $relationshipAttributes = $hyperlink->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships');
            $relationshipId = (string) ($relationshipAttributes['id'] ?? '');
            $target = $relationships[$relationshipId] ?? null;

            if ($target === null) {
                $location = (string) $hyperlink['location'];
                $target = $location !== '' ? '#'.$location : null;
            }

            if ($reference === '' || $target === null) {
                continue;
            }

            foreach ($this->cellReferencesFromRange($reference) as $cellReference) {
                $hyperlinks[$cellReference] = $target;
            }
        }

        return $hyperlinks;
    }

    /**
     * @return array<string, string>
     */
    private function readWorksheetRelationships(ZipArchive $zip): array
    {
        $relationshipsXml = $zip->getFromName('xl/worksheets/_rels/sheet1.xml.rels');

        if ($relationshipsXml === false) {
            return [];
        }

        $relationships = simplexml_load_string($relationshipsXml);

        if (! $relationships instanceof SimpleXMLElement) {
            return [];
        }

        $targets = [];

        foreach ($relationships->Relationship as $relationship) {
            $id = (string) $relationship['Id'];
            $target = (string) $relationship['Target'];

            if ($id !== '' && $target !== '') {
                $targets[$id] = $target;
            }
        }

        return $targets;
    }

    /**
     * @return array<int, string>
     */
    private function cellReferencesFromRange(string $reference): array
    {
        if (! str_contains($reference, ':')) {
            return [$reference];
        }

        [$startReference, $endReference] = explode(':', $reference, 2);
        $start = $this->cellCoordinate($startReference);
        $end = $this->cellCoordinate($endReference);

        if ($start === null || $end === null) {
            return [$reference];
        }

        $references = [];

        for ($row = $start['row']; $row <= $end['row']; $row++) {
            for ($column = $start['column']; $column <= $end['column']; $column++) {
                $references[] = $this->columnNameFromIndex($column).$row;
            }
        }

        return $references;
    }

    /**
     * @return array{column: int, row: int}|null
     */
    private function cellCoordinate(string $cellReference): ?array
    {
        if (! preg_match('/^([A-Z]+)(\d+)$/i', $cellReference, $matches)) {
            return null;
        }

        return [
            'column' => $this->columnIndexFromCellReference($cellReference),
            'row' => (int) $matches[2],
        ];
    }

    private function columnNameFromIndex(int $columnIndex): string
    {
        $name = '';
        $columnNumber = $columnIndex + 1;

        while ($columnNumber > 0) {
            $modulo = ($columnNumber - 1) % 26;
            $name = chr(65 + $modulo).$name;
            $columnNumber = intdiv($columnNumber - $modulo, 26);
        }

        return $name;
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
            'pasfotojpg' => 'photo_jpg',
            'fotojpg' => 'photo_jpg',
            'ktppdf' => 'ktp_pdf',
            'serifikatkompetensiinitialavsec' => 'initial_avsec_competency_certificate',
            'sertifikatkompetensiinitialavsec' => 'initial_avsec_competency_certificate',
            'kompetensiinitialavsec' => 'initial_avsec_competency_certificate',
            'sertifikatrefresherterakhir' => 'latest_refresher_certificate',
            'refresherterakhir' => 'latest_refresher_certificate',
            'ijazahpendidikanterakhir' => 'latest_education_certificate',
            'pendidikanterakhir' => 'latest_education_certificate',
            'bukulisensi' => 'license_book',
            'lisensi' => 'license_book',
            'daftarriwayathidup' => 'curriculum_vitae',
            'cv' => 'curriculum_vitae',
            'skck' => 'skck',
            'backgroundchech' => 'background_check',
            'backgroundcheck' => 'background_check',
            'nomorwa' => 'whatsapp_number',
            'nowa' => 'whatsapp_number',
            'whatsapp' => 'whatsapp_number',
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
    /**
     * @param  array<int, string>  $sharedStrings
     * @param  array<string, string>  $hyperlinks
     */
    private function xlsxCellValue(SimpleXMLElement $cell, array $sharedStrings, array $hyperlinks): ?string
    {
        $cellReference = (string) $cell['r'];

        if ($cellReference !== '' && array_key_exists($cellReference, $hyperlinks)) {
            return $hyperlinks[$cellReference];
        }

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
