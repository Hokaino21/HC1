<?php

use App\Models\Employee;
use App\Models\MandatoryTrainingClass;

use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;

it('creates a new mandatory training class', function () {
    $this->post(route('mandatory-training-classes.store'), [
        'name' => 'Avsec 1',
        'function_category' => 'Avsec',
    ])->assertRedirect();

    assertDatabaseHas('mandatory_training_classes', [
        'name' => 'Avsec 1',
        'function_category' => 'Avsec',
    ]);
});

it('updates a mandatory training class name and category', function () {
    $class = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec 1',
        'function_category' => 'Avsec',
    ]);

    $this->put(route('mandatory-training-classes.update', $class), [
        'name' => 'Avsec Khusus',
        'function_category' => 'Avsec',
    ])->assertRedirect();

    assertDatabaseHas('mandatory_training_classes', [
        'id' => $class->id,
        'name' => 'Avsec Khusus',
    ]);
});

it('deletes an empty mandatory training class without affecting employees', function () {
    $employee = Employee::query()->create([
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'unit' => 'teknik',
    ]);

    $class = MandatoryTrainingClass::query()->create([
        'name' => 'Kelas Kosong',
        'function_category' => 'Teknik',
    ]);

    $this->delete(route('mandatory-training-classes.destroy', $class))
        ->assertRedirect();

    assertDatabaseMissing('mandatory_training_classes', [
        'id' => $class->id,
    ]);

    assertDatabaseHas('employees', [
        'id' => $employee->id,
    ]);
});

it('prevents deleting a class with participants', function () {
    $class = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec 1',
        'function_category' => 'Avsec',
    ]);

    Employee::query()->create([
        'nik' => '1001',
        'name' => 'Budi Santoso',
        'mandatory_training_class_id' => $class->id,
    ]);

    $this->delete(route('mandatory-training-classes.destroy', $class))
        ->assertSessionHasErrors('class');

    assertDatabaseHas('mandatory_training_classes', [
        'id' => $class->id,
    ]);
});

it('moves an employee from one class to another and persists in database', function () {
    $classA = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec 1',
        'function_category' => 'Avsec',
    ]);

    $classB = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec 2',
        'function_category' => 'Avsec',
    ]);

    $employee = Employee::query()->create([
        'nik' => '1001',
        'name' => 'Peserta A',
        'function_category' => 'Avsec',
        'mandatory_training_class_id' => $classA->id,
    ]);

    $this->put(route('employees.move-to-class', $employee), [
        'mandatory_training_class_id' => $classB->id,
    ])->assertRedirect();

    assertDatabaseHas('employees', [
        'id' => $employee->id,
        'mandatory_training_class_id' => $classB->id,
    ]);

    // Verify when loading home page, the employee is still in Class B
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('employees.0.mandatory_training_class_id', $classB->id)
        );
});

it('enforces maximum 25 participants per class when moving', function () {
    $targetClass = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec Penuh',
        'function_category' => 'Avsec',
    ]);

    // Fill target class with 25 participants
    for ($i = 1; $i <= 25; $i++) {
        Employee::query()->create([
            'nik' => '900'.$i,
            'name' => 'Peserta '.$i,
            'mandatory_training_class_id' => $targetClass->id,
        ]);
    }

    $sourceClass = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec Lain',
        'function_category' => 'Avsec',
    ]);

    $employee = Employee::query()->create([
        'nik' => '9999',
        'name' => 'Peserta Baru',
        'mandatory_training_class_id' => $sourceClass->id,
    ]);

    $this->put(route('employees.move-to-class', $employee), [
        'mandatory_training_class_id' => $targetClass->id,
    ])->assertSessionHasErrors('mandatory_training_class_id');

    // Verify employee remains in source class
    assertDatabaseHas('employees', [
        'id' => $employee->id,
        'mandatory_training_class_id' => $sourceClass->id,
    ]);
});

it('does not overwrite existing manual class assignments during auto grouping', function () {
    $classA = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec 1',
        'function_category' => 'Avsec',
    ]);

    $classB = MandatoryTrainingClass::query()->create([
        'name' => 'Avsec 2',
        'function_category' => 'Avsec',
    ]);

    // Employee A was manually moved to Class B
    $employeeA = Employee::query()->create([
        'nik' => '1001',
        'name' => 'Andi',
        'function_category' => 'Avsec',
        'mandatory_training_class_id' => $classB->id,
    ]);

    // Employee B has no class assigned yet
    $employeeB = Employee::query()->create([
        'nik' => '1002',
        'name' => 'Budi',
        'function_category' => 'Avsec',
        'mandatory_training_class_id' => null,
    ]);

    // Loading home page triggers auto-grouping for unassigned employees only
    $this->get(route('home'))->assertOk();

    // Employee A must remain in Class B
    expect($employeeA->fresh()->mandatory_training_class_id)->toBe($classB->id);

    // Employee B was assigned to an available class
    expect($employeeB->fresh()->mandatory_training_class_id)->not->toBeNull();
});
