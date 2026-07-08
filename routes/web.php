<?php

use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\TemplateLetterController;
use Illuminate\Support\Facades\Route;

Route::get('/', [EmployeeController::class, 'index'])->name('home');
Route::post('/employees/import', [EmployeeController::class, 'store'])->name('employees.import');
Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
Route::post('/employees/export-mandatory-training', [EmployeeController::class, 'exportMandatoryTraining'])->name('employees.export-mandatory-training');
Route::get('/template-surat/pdf', [TemplateLetterController::class, 'pdf'])->name('template-surat.pdf');
