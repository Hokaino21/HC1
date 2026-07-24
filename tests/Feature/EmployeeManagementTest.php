<?php

use App\Models\Employee;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;

it('imports employees from a csv file', function () {
    Storage::fake('local');

    $file = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,jabatan,pg,unit,lokasi,skp expired,fungsi,pas foto(jpg),KTP(pdf),Serifikat Kompetensi Initial Avsec,sertifikat refresher terakhir,ijazah pendidikan terakhir,buku lisensi,daftar riwayat hidup,skck,background Chech,Nomor WA',
        '1001,Budi Santoso,Supervisor,PG1,Teknik,Terminal 1,2026-12-31,Operasional,budi.jpg,budi-ktp.pdf,budi-initial.pdf,budi-refresher.pdf,budi-ijazah.pdf,budi-lisensi.pdf,budi-cv.pdf,budi-skck.pdf,clear,628123456789',
        '1002,Sari Aminah,,PG2,Avsek,,31/01/2027,Keamanan,,,,,,,,,,',
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
        'location' => 'Terminal 1',
        'skp_expired' => '2026-12-31 00:00:00',
        'function_category' => 'Operasional',
        'photo_jpg' => 'budi.jpg',
        'ktp_pdf' => 'budi-ktp.pdf',
        'latest_education_certificate' => 'budi-ijazah.pdf',
        'license_book' => 'budi-lisensi.pdf',
        'curriculum_vitae' => 'budi-cv.pdf',
        'skck' => 'budi-skck.pdf',
        'background_check' => 'clear',
        'whatsapp_number' => '628123456789',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '1002',
        'name' => 'Sari Aminah',
        'position' => null,
        'unit' => 'avsek',
        'location' => null,
        'skp_expired' => '2027-01-31 00:00:00',
        'photo_jpg' => null,
        'ktp_pdf' => null,
        'whatsapp_number' => null,
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
        'photo_jpg' => 'https://example.com/foto-rina.jpg',
    ]);
});

it('stores another row when the same nik has a different license', function () {
    $firstFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,kategori,sub license',
        '3001,Dian Saputra,Teknik,Ahli,ALS',
    ]));

    $secondFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,kategori',
        '3001,Dian Saputra,Avsec,Junior',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $firstFile,
    ])->assertRedirect();

    $this->post(route('employees.import'), [
        'employees_file' => $secondFile,
    ])->assertRedirect();

    expect(Employee::query()->where('nik', '3001')->count())->toBe(2);

    assertDatabaseHas('employees', [
        'nik' => '3001',
        'name' => 'Dian Saputra',
        'function_category' => 'Teknik',
        'sub_license' => 'ALS',
        'avsec_category' => 'Ahli',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '3001',
        'name' => 'Dian Saputra',
        'function_category' => 'Avsec',
        'sub_license' => null,
        'avsec_category' => 'Junior',
    ]);
});

it('stores another row when the same nik has a different sub license or category', function () {
    $firstFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,kategori,sub license,unit,lokasi',
        '3002,Dian Saputra,Teknik,Ahli,ALS,Teknik,Hanggar A',
    ]));

    $secondFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,kategori,sub license,unit,lokasi',
        '3002,Dian Saputra,Teknik,Terampil,ACS,Teknik,Hanggar B',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $firstFile,
    ])->assertRedirect();

    $this->post(route('employees.import'), [
        'employees_file' => $secondFile,
    ])->assertRedirect();

    expect(Employee::query()->where('nik', '3002')->count())->toBe(2);

    assertDatabaseHas('employees', [
        'nik' => '3002',
        'function_category' => 'Teknik',
        'sub_license' => 'ALS',
        'avsec_category' => 'Ahli',
        'location' => 'Hanggar A',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '3002',
        'function_category' => 'Teknik',
        'sub_license' => 'ACS',
        'avsec_category' => 'Terampil',
        'location' => 'Hanggar B',
    ]);
});

it('updates the exact imported row without replacing another employee combination', function () {
    $firstFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,kategori,sub license,unit,lokasi,nomor wa',
        '3003,Dian Saputra,Teknik,Ahli,ALS,Teknik,Hanggar A,0812000001',
    ]));

    $secondFile = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,kategori,sub license,unit,lokasi,nomor wa',
        '3003,Dian Saputra,Teknik,Ahli,ALS,Teknik,Hanggar C,0812000009',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $firstFile,
    ])->assertRedirect();

    $this->post(route('employees.import'), [
        'employees_file' => $secondFile,
    ])->assertRedirect();

    expect(Employee::query()->where('nik', '3003')->count())->toBe(1);

    assertDatabaseHas('employees', [
        'nik' => '3003',
        'function_category' => 'Teknik',
        'sub_license' => 'ALS',
        'avsec_category' => 'Ahli',
        'location' => 'Hanggar C',
        'whatsapp_number' => '0812000009',
    ]);
});

it('filters employees by license on the home page', function () {
    Employee::query()->create([
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'unit' => 'avsec',
        'function_category' => 'TEKNIK',
    ]);

    Employee::query()->create([
        'nik' => '1002',
        'name' => 'Sari Aminah',
        'position' => null,
        'unit' => 'teknik',
        'location' => null,
        'function_category' => 'Avsec',
    ]);

    $this->get(route('home', ['license' => 'Teknik']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('filters.license', 'teknik')
            ->has('employees', 2)
        );
});

it('sorts employees by person and marks employees with multiple license rows', function () {
    Employee::query()->create([
        'nik' => '9002',
        'name' => 'Budi Santoso',
        'function_category' => 'PKKP',
    ]);

    Employee::query()->create([
        'nik' => '9001',
        'name' => 'Andi Pratama',
        'function_category' => 'Teknik',
        'sub_license' => 'ALS',
        'avsec_category' => 'Ahli',
    ]);

    Employee::query()->create([
        'nik' => '9001',
        'name' => 'Andi Pratama',
        'function_category' => 'Avsec',
        'avsec_category' => 'Junior',
    ]);

    Employee::query()->create([
        'nik' => '9001',
        'name' => 'Andi Pratama',
        'function_category' => 'Teknik',
        'sub_license' => 'ACS',
        'avsec_category' => 'Terampil',
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('employees.0.name', 'Andi Pratama')
            ->where('employees.1.name', 'Andi Pratama')
            ->where('employees.2.name', 'Andi Pratama')
            ->where('employees.3.name', 'Budi Santoso')
            ->where('employees.0.function_category', 'Avsec')
            ->where('employees.1.function_category', 'Teknik')
            ->where('employees.1.sub_license', 'ALS')
            ->where('employees.2.function_category', 'Teknik')
            ->where('employees.2.sub_license', 'ACS')
            ->where('employees.0.has_multiple_licenses', true)
            ->where('employees.1.has_multiple_licenses', true)
            ->where('employees.2.has_multiple_licenses', true)
            ->where('employees.3.has_multiple_licenses', false)
            ->where('employees.0.license_count_by_name', 3)
            ->where('employees.1.license_count_by_name', 3)
            ->where('employees.2.license_count_by_name', 3)
            ->where('employees.3.license_count_by_name', 1)
        );
});

it('exports mandatory training participants to a pdf', function () {
    $employee = Employee::query()->create([
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'position' => 'Supervisor',
        'unit' => 'teknik',
        'location' => 'Terminal 1',
    ]);

    $this->post(route('employees.export-mandatory-training'), [
        'document_title' => 'Daftar Peserta Mandatory',
        'batch_name' => 'Batch Teknik',
        'employee_ids' => [$employee->id],
    ])
        ->assertOk()
        ->assertDownload('daftar-peserta-mandatory.pdf');
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
    $zip->addFromString('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="16" uniqueCount="16"><si><t>nik</t></si><si><t>nama</t></si><si><t>jabatan</t></si><si><t>pg</t></si><si><t>unit</t></si><si><t>skp expired</t></si><si><t>fungsi</t></si><si><t>2001</t></si><si><t>Rina Putri</t></si><si><t>Staff</t></si><si><t>PG3</t></si><si><t>PKPK</t></si><si><t>2027-03-15</t></si><si><t>Rescue</t></si><si><t>pas foto(jpg)</t></si><si><t>link tes</t></si></sst>');
    $zip->addFromString('xl/worksheets/_rels/sheet1.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/foto-rina.jpg" TargetMode="External"/></Relationships>');
    $zip->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c><c r="G1" t="s"><v>6</v></c><c r="H1" t="s"><v>14</v></c></row><row r="2"><c r="A2" t="s"><v>7</v></c><c r="B2" t="s"><v>8</v></c><c r="C2" t="s"><v>9</v></c><c r="D2" t="s"><v>10</v></c><c r="E2" t="s"><v>11</v></c><c r="F2" t="s"><v>12</v></c><c r="G2" t="s"><v>13</v></c><c r="H2" t="s"><v>15</v></c></row></sheetData><hyperlinks><hyperlink ref="H2" r:id="rId3"/></hyperlinks></worksheet>');
    $zip->close();

    $content = file_get_contents($path);
    unlink($path);

    return $content ?: '';
}
