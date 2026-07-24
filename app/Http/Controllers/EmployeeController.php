<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportEmployeesRequest;
use App\Models\Employee;
use App\Models\EmployeeAvsecArchive;
use Barryvdh\DomPDF\Facade\Pdf;
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
    /**
     * @var array<int, string>
     */
    private const EMPLOYEE_DOCUMENT_COLUMNS = [
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
    ];

    /**
     * @var array<int, string>
     */
    private const EMPLOYEE_TEMPLATE_COLUMNS = [
        'NIK',
        'Nama',
        'Tempat Lahir',
        'Tanggal Lahir',
        'Jenis Kelamin',
        'Jabatan',
        'PG',
        'Unit',
        'Lokasi',
        'SKP Expired',
        'License',
        'Jadwal Diklat',
        'Sub License',
        'Kategori',
        'Pas Foto',
        'KTP',
        'Sertifikat Kompetensi',
        'Sertifikat Terakhir',
        'Ijazah Pendidikan Terakhir',
        'Buku Lisensi',
        'Daftar Riwayat Hidup',
        'SKCK',
        'Background Check',
        'Nomor WA',
    ];

    /**
     * @var array<int, string>
     */
    private const TEKNIK_SUB_LICENSES = [
        'A2B',
        'ACS',
        'ADG',
        'ALS',
        'BAF',
        'CCR',
        'FSD',
        'FSU',
        'GNS',
        'IFS',
        'P3KP',
        'P3UKP',
        'PBC',
        'PSS',
        'TQM',
        'TRD',
        'WPS',
    ];

    public function index(Request $request): Response
    {
        $license = $request->string('license')->toString();

        if ($license === '') {
            $license = $request->string('unit')->toString();
        }

        $license = $this->normalizeLicenseFilter($license);

        $employees = Employee::query()
            ->with('avsecArchives')
            ->orderBy('name')
            ->orderBy('nik')
            ->orderBy('function_category')
            ->orderBy('avsec_category')
            ->orderBy('sub_license')
            ->orderBy('id')
            ->get();

        $licenseCountsByPerson = $employees
            ->groupBy(
                fn (Employee $employee): string => $this->employeePersonKey(
                    $employee->nik,
                ),
            )
            ->map(fn ($group): int => $group->count());

        $employees = $employees
            ->map(fn (Employee $employee): array => [
                'has_multiple_licenses' => ($licenseCountsByPerson->get(
                    $this->employeePersonKey($employee->nik),
                    0,
                ) > 1),
                'license_count_by_name' => $licenseCountsByPerson->get(
                    $this->employeePersonKey($employee->nik),
                    0,
                ),
                'id' => $employee->id,
                'nik' => $employee->nik,
                'name' => $employee->name,
                'place_of_birth' => $employee->place_of_birth,
                'date_of_birth' => $employee->date_of_birth?->format('Y-m-d'),
                'gender' => $employee->gender,
                'position' => $employee->position,
                'pg' => $employee->pg,
                'unit' => $employee->unit,
                'location' => $employee->location,
                'unit_label' => $employee->unit ? Str::of($employee->unit)->upper()->toString() : null,
                'skp_expired' => $employee->skp_expired?->format('Y-m-d'),
                'function_category' => $employee->function_category,
                'sub_license' => $employee->sub_license,
                'training_schedule' => $employee->training_schedule,
                'avsec_category' => $employee->avsec_category,
                'avsec_archives' => $employee->avsecArchives->map(fn ($archive): array => [
                    'id' => (string) $archive->id,
                    'nik' => $archive->nik,
                    'name' => $archive->name,
                    'place_of_birth' => $archive->place_of_birth,
                    'date_of_birth' => $archive->date_of_birth?->format('Y-m-d'),
                    'gender' => $archive->gender,
                    'position' => $archive->position,
                    'pg' => $archive->pg,
                    'unit' => $archive->unit,
                    'location' => $archive->location,
                    'skp_expired' => $archive->skp_expired?->format('Y-m-d'),
                    'function_category' => $archive->function_category,
                    'sub_license' => $archive->sub_license,
                    'training_schedule' => $archive->training_schedule,
                    'avsec_category' => $archive->avsec_category,
                    'photo_jpg' => $archive->photo_jpg,
                    'ktp_pdf' => $archive->ktp_pdf,
                    'competency_certificate' => $archive->competency_certificate,
                    'latest_certificate' => $archive->latest_certificate,
                    'latest_education_certificate' => $archive->latest_education_certificate,
                    'license_book' => $archive->license_book,
                    'curriculum_vitae' => $archive->curriculum_vitae,
                    'skck' => $archive->skck,
                    'background_check' => $archive->background_check,
                    'whatsapp_number' => $archive->whatsapp_number,
                    'archived_at' => $archive->archived_at?->toIso8601String(),
                ])->values()->all(),
                ...$this->employeeDocumentData($employee),
            ]);

        return Inertia::render('welcome', [
            'employees' => $employees,
            'filters' => [
                'license' => $license,
            ],
        ]);
    }

    private function employeePersonKey(?string $nik): string
    {
        return Str::lower(trim((string) $nik));
    }

    private function normalizeLicenseFilter(string $license): ?string
    {
        $normalized = Str::lower(trim($license));

        if ($normalized === '') {
            return null;
        }

        return match ($normalized) {
            'avsek' => 'avsec',
            'pkpk' => 'pkkp',
            default => $normalized,
        };
    }

    private function normalizeGender(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = Str::lower(trim($value));

        return match ($normalized) {
            '', '-' => null,
            'l', 'lk', 'laki', 'lakilaki', 'pria', 'male', 'm' => 'Laki-laki',
            'p', 'pr', 'perempuan', 'wanita', 'female', 'f' => 'Perempuan',
            default => $value,
        };
    }

    private function normalizeFunctionCategory(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = Str::lower(trim($value));

        return match ($normalized) {
            '', '-' => null,
            'avsek', 'avsec' => 'Avsec',
            'pkpk', 'pkkp' => 'PKKP',
            'teknik' => 'Teknik',
            'arff' => 'ARFF',
            'amc' => 'AMC',
            default => $value,
        };
    }

    private function normalizeLicenseCategory(
        ?string $functionCategory,
        ?string $category,
    ): ?string {
        if ($category === null) {
            return null;
        }

        $normalizedCategory = Str::lower(trim($category));
        $normalizedLicense = Str::lower(trim((string) $functionCategory));

        if ($normalizedCategory === '' || $normalizedCategory === '-') {
            return null;
        }

        if ($normalizedLicense === 'avsec' || $normalizedLicense === 'avsek') {
            return match ($normalizedCategory) {
                'basic' => 'Basic',
                'junior' => 'Junior',
                'senior' => 'Senior',
                default => $category,
            };
        }

        if ($normalizedLicense === 'teknik') {
            return match ($normalizedCategory) {
                'terampil' => 'Terampil',
                'ahli' => 'Ahli',
                default => $category,
            };
        }

        return null;
    }

    private function normalizeSubLicense(
        ?string $functionCategory,
        ?string $subLicense,
    ): ?string {
        if ($subLicense === null) {
            return null;
        }

        $normalizedLicense = Str::lower(trim((string) $functionCategory));

        if ($normalizedLicense !== 'teknik') {
            return null;
        }

        $normalizedSubLicense = Str::upper(trim($subLicense));

        if ($normalizedSubLicense === '' || $normalizedSubLicense === '-') {
            return null;
        }

        foreach (self::TEKNIK_SUB_LICENSES as $allowedSubLicense) {
            if ($normalizedSubLicense === $allowedSubLicense) {
                return $allowedSubLicense;
            }
        }

        return $normalizedSubLicense;
    }

    /**
     * @param  array<int, string>  $headers
     */
    private function employeeTemplateWorkbook(array $headers): string
    {
        $path = tempnam(sys_get_temp_dir(), 'employee-template');

        if ($path === false) {
            throw ValidationException::withMessages([
                'employees_file' => 'Template Excel tidak bisa dibuat.',
            ]);
        }

        $xlsxPath = $path.'.xlsx';
        rename($path, $xlsxPath);

        $zip = new ZipArchive;
        $opened = $zip->open($xlsxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        if ($opened !== true) {
            @unlink($xlsxPath);

            throw ValidationException::withMessages([
                'employees_file' => 'Template Excel tidak bisa dibuat.',
            ]);
        }

        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data Karyawan" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->employeeTemplateSheetXml($headers));
        $zip->close();

        $content = file_get_contents($xlsxPath);
        @unlink($xlsxPath);

        if ($content === false) {
            throw ValidationException::withMessages([
                'employees_file' => 'Template Excel tidak bisa dibaca.',
            ]);
        }

        return $content;
    }

    /**
     * @param  array<int, string>  $headers
     */
    private function employeeTemplateSheetXml(array $headers): string
    {
        $cells = collect($headers)
            ->values()
            ->map(function (string $value, int $index): string {
                $cellReference = $this->columnNameFromIndex($index).'1';
                $escapedValue = htmlspecialchars($value, ENT_XML1);

                return '<c r="'.$cellReference.'" t="inlineStr"><is><t>'.$escapedValue.'</t></is></c>';
            })
            ->implode('');

        return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">'.$cells.'</row></sheetData></worksheet>';
    }

    public function store(ImportEmployeesRequest $request): RedirectResponse
    {
        $file = $request->file('employees_file');
        $rows = $this->readEmployeeRows($file->getRealPath(), $file->getClientOriginalExtension());

        foreach ($rows as $row) {
            $employee = $this->findEmployeeForImportRow($row) ?? new Employee;

            $employee->fill($row);
            $employee->save();
        }

        return back()->with('success', count($rows).' data karyawan berhasil diupload.');
    }

    /**
     * @param  array<string, CarbonImmutable|string|null>  $row
     */
    private function findEmployeeForImportRow(array $row): ?Employee
    {
        $query = Employee::query()
            ->where('nik', (string) $row['nik']);

        foreach (['function_category', 'sub_license', 'avsec_category'] as $column) {
            $value = Arr::get($row, $column);

            if ($value === null) {
                $query->whereNull($column);

                continue;
            }

            $query->where($column, $value);
        }

        return $query->first();
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
            'place_of_birth' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string',
            'position' => 'nullable|string',
            'pg' => 'nullable|string',
            'unit' => 'nullable|string',
            'location' => 'nullable|string',
            'skp_expired' => 'nullable|date',
            'function_category' => 'nullable|string',
            'sub_license' => 'nullable|string',
            'training_schedule' => 'nullable|string',
            'avsec_category' => 'nullable|string',
            'photo_jpg' => 'nullable|string',
            'ktp_pdf' => 'nullable|string',
            'competency_certificate' => 'nullable|string',
            'latest_certificate' => 'nullable|string',
            'latest_education_certificate' => 'nullable|string',
            'license_book' => 'nullable|string',
            'curriculum_vitae' => 'nullable|string',
            'skck' => 'nullable|string',
            'background_check' => 'nullable|string',
            'whatsapp_number' => 'nullable|string',
        ]);

        if (Arr::exists($validated, 'function_category')) {
            $validated['function_category'] = $this->normalizeFunctionCategory(
                Arr::get($validated, 'function_category'),
            );
        }

        if (Arr::exists($validated, 'sub_license')) {
            $validated['sub_license'] = $this->normalizeSubLicense(
                Arr::get($validated, 'function_category', $employee->function_category),
                Arr::get($validated, 'sub_license'),
            );
        }

        if (Arr::exists($validated, 'avsec_category')) {
            $validated['avsec_category'] = $this->normalizeLicenseCategory(
                Arr::get($validated, 'function_category', $employee->function_category),
                Arr::get($validated, 'avsec_category'),
            );
        }

        $employeeIsAvsec = in_array(
            Str::lower(trim((string) $employee->function_category)),
            ['avsec', 'avsek'],
            true,
        );
        $nextAvsecCategory = Arr::get($validated, 'avsec_category');

        if (
            $employeeIsAvsec &&
            $employee->avsec_category !== $nextAvsecCategory
        ) {
            EmployeeAvsecArchive::query()->create([
                'employee_id' => $employee->id,
                'nik' => $employee->nik,
                'name' => $employee->name,
                'place_of_birth' => $employee->place_of_birth,
                'date_of_birth' => $employee->date_of_birth,
                'gender' => $employee->gender,
                'position' => $employee->position,
                'pg' => $employee->pg,
                'unit' => $employee->unit,
                'location' => $employee->location,
                'skp_expired' => $employee->skp_expired,
                'function_category' => $employee->function_category,
                'sub_license' => $employee->sub_license,
                'training_schedule' => $employee->training_schedule,
                'avsec_category' => $employee->avsec_category ?? 'Belum diisi',
                ...$this->employeeDocumentData($employee),
                'archived_at' => CarbonImmutable::now(),
            ]);
        }

        $employee->update($validated);

        return back()->with('success', 'Data karyawan berhasil diperbarui.');
    }

    public function downloadTemplate(): \Illuminate\Http\Response
    {
        $workbook = $this->employeeTemplateWorkbook(self::EMPLOYEE_TEMPLATE_COLUMNS);

        return response($workbook, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="template-data-karyawan.xlsx"',
        ]);
    }

    public function exportMandatoryTraining(Request $request): \Illuminate\Http\Response
    {
        $validated = $request->validate([
            'document_title' => 'required|string',
            'batch_name' => 'required|string',
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'integer|exists:employees,id',
        ]);

        $employees = Employee::whereIn('id', $validated['employee_ids'])->get();

        $pdf = Pdf::loadView('mandatory-training', [
            'document_title' => $validated['document_title'],
            'batch_name' => $validated['batch_name'],
            'employees' => $employees,
        ]);

        return $pdf->download(Str::slug($validated['document_title']).'.pdf');
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
                'place_of_birth' => $this->cellValue($values, $columns['place_of_birth'] ?? null),
                'date_of_birth' => $this->parseDate($this->cellValue($values, $columns['date_of_birth'] ?? null), $lineNumber + 2),
                'gender' => $this->normalizeGender($this->cellValue($values, $columns['gender'] ?? null)),
                'position' => $this->cellValue($values, $columns['position'] ?? null),
                'pg' => $this->cellValue($values, $columns['pg'] ?? null),
                'unit' => $unit ? Str::of($unit)->lower()->toString() : null,
                'location' => $this->cellValue($values, $columns['location'] ?? null),
                'skp_expired' => $this->parseDate($this->cellValue($values, $columns['skp_expired'] ?? null), $lineNumber + 2),
                'function_category' => $this->normalizeFunctionCategory($this->cellValue($values, $columns['function_category'] ?? null)),
                'sub_license' => $this->normalizeSubLicense(
                    $this->cellValue($values, $columns['function_category'] ?? null),
                    $this->cellValue($values, $columns['sub_license'] ?? null),
                ),
                'avsec_category' => $this->normalizeLicenseCategory(
                    $this->cellValue($values, $columns['function_category'] ?? null),
                    $this->cellValue($values, $columns['avsec_category'] ?? null),
                ),
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
            'tempatlahir' => 'place_of_birth',
            'placeofbirth' => 'place_of_birth',
            'tanggallahir' => 'date_of_birth',
            'dateofbirth' => 'date_of_birth',
            'jeniskelamin' => 'gender',
            'gender' => 'gender',
            'sex' => 'gender',
            'jabatan' => 'position',
            'position' => 'position',
            'pg' => 'pg',
            'unit' => 'unit',
            'lokasi' => 'location',
            'location' => 'location',
            'skpexpired' => 'skp_expired',
            'skpberakhir' => 'skp_expired',
            'fungsi' => 'function_category',
            'function' => 'function_category',
            'lisensi' => 'function_category',
            'license' => 'function_category',
            'sublicense' => 'sub_license',
            'sublisensi' => 'sub_license',
            'subfungsi' => 'sub_license',
            'kategori' => 'avsec_category',
            'category' => 'avsec_category',
            'pasfotojpg' => 'photo_jpg',
            'fotojpg' => 'photo_jpg',
            'pasfoto' => 'photo_jpg',
            'ktppdf' => 'ktp_pdf',
            'ktp' => 'ktp_pdf',
            'serifikatkompetensi' => 'competency_certificate',
            'sertifikatkompetensi' => 'competency_certificate',
            'kompetensi' => 'competency_certificate',
            'sertifikatterakhir' => 'latest_certificate',
            'sertifikatterakhir' => 'latest_certificate',
            'sertifikat' => 'latest_certificate',
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
