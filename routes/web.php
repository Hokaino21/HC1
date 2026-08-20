<?php

use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\MandatoryTrainingClassController;
use App\Http\Controllers\TemplateLetterController;
use Illuminate\Support\Facades\Route;

Route::get('/', [EmployeeController::class, 'index'])->name('home');
Route::post('/employees/import', [EmployeeController::class, 'store'])->name('employees.import');
Route::get('/employees/template', [EmployeeController::class, 'downloadTemplate'])->name('employees.template');
Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
Route::post('/employees/export-mandatory-training', [EmployeeController::class, 'exportMandatoryTraining'])->name('employees.export-mandatory-training');
Route::post('/employees/export-excel', [EmployeeController::class, 'exportExcel'])->name('employees.export-excel');
Route::get('/template-surat/pdf', [TemplateLetterController::class, 'pdf'])->name('template-surat.pdf');

Route::get('/mandatory-training-classes', [MandatoryTrainingClassController::class, 'index'])->name('mandatory-training-classes.index');
Route::post('/mandatory-training-classes', [MandatoryTrainingClassController::class, 'store'])->name('mandatory-training-classes.store');
Route::put('/mandatory-training-classes/{mandatoryTrainingClass}', [MandatoryTrainingClassController::class, 'update'])->name('mandatory-training-classes.update');
Route::delete('/mandatory-training-classes/{mandatoryTrainingClass}', [MandatoryTrainingClassController::class, 'destroy'])->name('mandatory-training-classes.destroy');
Route::put('/employees/{employee}/move-to-class', [MandatoryTrainingClassController::class, 'moveEmployee'])->name('employees.move-to-class');
