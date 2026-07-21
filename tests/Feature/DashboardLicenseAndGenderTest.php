<?php

use App\Models\Employee;
use Illuminate\Http\UploadedFile;

use function Pest\Laravel\assertDatabaseHas;

it('keeps dashboard data complete while preserving selected employee license filter', function () {
    Employee::query()->create([
        'nik' => '5001',
        'name' => 'Budi Santoso',
        'function_category' => 'TEKNIK',
    ]);

    Employee::query()->create([
        'nik' => '5002',
        'name' => 'Sari Aminah',
        'function_category' => 'Avsec',
    ]);

    Employee::query()->create([
        'nik' => '5002',
        'name' => 'Sari Aminah',
        'function_category' => 'Teknik',
        'sub_license' => 'ALS',
        'avsec_category' => 'Ahli',
    ]);

    $this->get(route('home', ['license' => 'Teknik']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('filters.license', 'teknik')
            ->has('employees', 3)
            ->where('employees.1.has_multiple_licenses', true)
            ->where('employees.2.has_multiple_licenses', true)
        );
});

it('imports employee gender from csv aliases', function () {
    $file = UploadedFile::fake()->createWithContent('employees.csv', implode("\n", [
        'nik,nama,jenis kelamin,fungsi',
        '7001,Rina Putri,P,Avsec',
        '7002,Budi Santoso,L,Teknik',
    ]));

    $this->post(route('employees.import'), [
        'employees_file' => $file,
    ])->assertRedirect();

    assertDatabaseHas('employees', [
        'nik' => '7001',
        'gender' => 'Perempuan',
        'function_category' => 'Avsec',
    ]);

    assertDatabaseHas('employees', [
        'nik' => '7002',
        'gender' => 'Laki-laki',
        'function_category' => 'Teknik',
    ]);
});
