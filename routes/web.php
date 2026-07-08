<?php

use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\TemplateLetterController;
use Illuminate\Support\Facades\Route;

Route::get('/', [EmployeeController::class, 'index'])->name('home');
Route::post('/employees/import', [EmployeeController::class, 'store'])->name('employees.import');
Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
Route::get('/template-surat/pdf', [TemplateLetterController::class, 'pdf'])->name('template-surat.pdf');
