<?php

use App\Models\Employee;

use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;

it('archives employee data before updating avsec category', function () {
    $employee = Employee::query()->create([
        'nik' => '2001',
        'name' => 'Andi Pratama',
        'function_category' => 'Avsec',
        'avsec_category' => 'Basic',
        'gender' => 'Laki-laki',
    ]);

    $this->put(route('employees.update', $employee), [
        'nik' => $employee->nik,
        'name' => $employee->name,
        'avsec_category' => 'Senior',
    ])->assertRedirect();

    assertDatabaseHas('employee_avsec_archives', [
        'employee_id' => $employee->id,
        'avsec_category' => 'Basic',
        'nik' => $employee->nik,
        'name' => $employee->name,
        'gender' => 'Laki-laki',
        'function_category' => $employee->function_category,
    ]);

    $employee->refresh();

    expect($employee->avsec_category)->toBe('Senior');
});

it('does not archive when updating non-avsec employees', function () {
    $employee = Employee::query()->create([
        'nik' => '2002',
        'name' => 'Budi Santoso',
        'function_category' => 'Teknik',
        'avsec_category' => null,
    ]);

    $this->put(route('employees.update', $employee), [
        'nik' => $employee->nik,
        'name' => $employee->name,
        'avsec_category' => 'Senior',
    ])->assertRedirect();

    assertDatabaseMissing('employee_avsec_archives', [
        'employee_id' => $employee->id,
    ]);
});
