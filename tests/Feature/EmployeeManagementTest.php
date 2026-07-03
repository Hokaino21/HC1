<?php

use App\Models\Employee;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;

it('imports employees from a csv file', function () {
    Storage::fake('local');

    $file = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,jabatan,pg,unit,skp expired,fungsi',
        '1001,Budi Santoso,Supervisor,PG1,Teknik,2026-12-31,Operasional',
        '1002,Sari Aminah,Officer,PG2,Avsek,31/01/2027,Keamanan',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $file,
    ])->assertRedirect();

    assertDatabaseHas('employees', [
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'position' => 'Supervisor',
        'pg' => 'PG1',
        'unit' => 'teknik',
        'skp_expired' => '2026-12-31 00:00:00',
        'function_category' => 'Operasional',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '1002',
        'name' => 'Sari Aminah',
        'unit' => 'avsek',
        'skp_expired' => '2027-01-31 00:00:00',
    ]);
});

it('imports employees from an xlsx file', function () {
    $file = UploadedFile::fake()->createWithContent('employees.xlsx', employeeWorkbookContent());

    $this->post(route('employees.import'), [
        'employees_file' => $file,
    ])->assertRedirect();

    assertDatabaseHas('employees', [
        'nik' => '2001',
        'name' => 'Rina Putri',
        'position' => 'Staff',
        'pg' => 'PG3',
        'unit' => 'pkpk',
        'skp_expired' => '2027-03-15 00:00:00',
        'function_category' => 'Rescue',
    ]);
});

it('updates employees when importing the same nik again', function () {
    $firstFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,jabatan,pg,unit,skp expired,fungsi',
        '3001,Dian Saputra,Officer,PG1,Teknik,2027-01-01,Operasional',
    ]));

    $secondFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,jabatan,pg,unit,skp expired,fungsi',
        '3001,Dian Saputra,Supervisor,PG2,Avsek,2028-02-02,Keamanan',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $firstFile,
    ])->assertRedirect();

    $this->post(route('employees.import'), [
        'employees_file' => $secondFile,
    ])->assertRedirect();

    expect(Employee::query()->where('nik', '3001')->count())->toBe(1);

    assertDatabaseHas('employees', [
        'nik' => '3001',
        'position' => 'Supervisor',
        'pg' => 'PG2',
        'unit' => 'avsek',
        'skp_expired' => '2028-02-02 00:00:00',
        'function_category' => 'Keamanan',
    ]);
});

it('filters employees by unit on the home page', function () {
    Employee::query()->create([
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'unit' => 'teknik',
    ]);

    Employee::query()->create([
        'nik' => '1002',
        'name' => 'Sari Aminah',
        'unit' => 'avsek',
    ]);

    $this->get(route('home', ['unit' => 'teknik']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('filters.unit', 'teknik')
            ->has('employees', 1)
            ->where('employees.0.nik', '1001')
        );
});

it('deletes an employee', function () {
    $employee = Employee::query()->create([
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'unit' => 'teknik',
    ]);

    $this->delete(route('employees.destroy', $employee))->assertRedirect();

    assertDatabaseMissing('employees', [
        'id' => $employee->id,
    ]);
});

function employeeWorkbookContent(): string
{
    $path = tempnam(sys_get_temp_dir(), 'employees').'.xlsx';
    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Employees" sheetId="1" r:id="rId1"/></sheets></workbook>');
    $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>');
    $zip->addFromString('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="14" uniqueCount="14"><si><t>nik</t></si><si><t>nama</t></si><si><t>jabatan</t></si><si><t>pg</t></si><si><t>unit</t></si><si><t>skp expired</t></si><si><t>fungsi</t></si><si><t>2001</t></si><si><t>Rina Putri</t></si><si><t>Staff</t></si><si><t>PG3</t></si><si><t>PKPK</t></si><si><t>2027-03-15</t></si><si><t>Rescue</t></si></sst>');
    $zip->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c><c r="G1" t="s"><v>6</v></c></row><row r="2"><c r="A2" t="s"><v>7</v></c><c r="B2" t="s"><v>8</v></c><c r="C2" t="s"><v>9</v></c><c r="D2" t="s"><v>10</v></c><c r="E2" t="s"><v>11</v></c><c r="F2" t="s"><v>12</v></c><c r="G2" t="s"><v>13</v></c></row></sheetData></worksheet>');
    $zip->close();

    $content = file_get_contents($path);
    unlink($path);

    return $content ?: '';
}