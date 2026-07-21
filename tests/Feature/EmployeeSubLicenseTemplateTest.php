<?php

use Illuminate\Http\UploadedFile;

use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;

it('imports sub license and category from csv file', function () {
    $file = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,license,sub license,kategori',
        '8001,Dian Saputra,Teknik,ALS,Ahli',
        '8002,Sari Aminah,Avsec,,Junior',
        '8003,Rendra Kurniawan,AMC,PSS,Terampil',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $file,
    ])->assertRedirect();

    assertDatabaseHas('employees', [
        'nik' => '8001',
        'function_category' => 'Teknik',
        'sub_license' => 'ALS',
        'avsec_category' => 'Ahli',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '8002',
        'function_category' => 'Avsec',
        'sub_license' => null,
        'avsec_category' => 'Junior',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '8003',
        'function_category' => 'AMC',
        'sub_license' => null,
        'avsec_category' => null,
    ]);

    assertDatabaseMissing('employees', [
        'nik' => '8003',
        'sub_license' => 'PSS',
    ]);
});

it('downloads employee excel template with employee table headers', function () {
    $response = $this->get(route('employees.template'));

    $response->assertOk();
    $response->assertHeader(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    $path = tempnam(sys_get_temp_dir(), 'employee-template-test');
    $xlsxPath = $path.'.xlsx';

    rename($path, $xlsxPath);
    file_put_contents($xlsxPath, $response->getContent());

    $zip = new ZipArchive;
    $opened = $zip->open($xlsxPath);

    expect($opened)->toBeTrue();

    $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();
    unlink($xlsxPath);

    expect($sheetXml)
        ->toContain('Jenis Kelamin')
        ->toContain('Sub License')
        ->toContain('Kategori')
        ->toContain('Nomor WA');
});
