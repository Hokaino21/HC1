<?php

namespace App\Http\Controllers;

use App\Http\Requests\MoveEmployeeToClassRequest;
use App\Http\Requests\StoreMandatoryTrainingClassRequest;
use App\Http\Requests\UpdateMandatoryTrainingClassRequest;
use App\Models\Employee;
use App\Models\MandatoryTrainingClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class MandatoryTrainingClassController extends Controller
{
    public const MAX_PARTICIPANTS_PER_CLASS = 25;

    public function index()
    {
        return MandatoryTrainingClass::query()
            ->withCount('employees')
            ->orderBy('function_category')
            ->orderBy('name')
            ->orderBy('id')
            ->get()
            ->map(fn (MandatoryTrainingClass $class): array => [
                'id' => $class->id,
                'name' => $class->name,
                'function_category' => $class->function_category,
                'employees_count' => $class->employees_count,
            ])
            ->values()
            ->all();
    }

    public function store(StoreMandatoryTrainingClassRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $existing = MandatoryTrainingClass::query()
            ->where('name', $validated['name'])
            ->when(
                $validated['function_category'] !== null,
                fn ($query) => $query->where('function_category', $validated['function_category']),
                fn ($query) => $query->whereNull('function_category'),
            )
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'name' => 'Kelas dengan nama dan kategori yang sama sudah ada.',
            ]);
        }

        MandatoryTrainingClass::query()->create($validated);

        return back()->with('success', 'Kelas berhasil dibuat.');
    }

    public function update(
        UpdateMandatoryTrainingClassRequest $request,
        MandatoryTrainingClass $mandatoryTrainingClass,
    ): RedirectResponse {
        $validated = $request->validated();

        $existing = MandatoryTrainingClass::query()
            ->where('name', $validated['name'])
            ->when(
                $validated['function_category'] !== null,
                fn ($query) => $query->where('function_category', $validated['function_category']),
                fn ($query) => $query->whereNull('function_category'),
            )
            ->where('id', '!=', $mandatoryTrainingClass->id)
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'name' => 'Kelas dengan nama dan kategori yang sama sudah ada.',
            ]);
        }

        $mandatoryTrainingClass->update($validated);

        return back()->with('success', 'Kelas berhasil diperbarui.');
    }

    public function destroy(MandatoryTrainingClass $mandatoryTrainingClass): RedirectResponse
    {
        $participantsCount = $mandatoryTrainingClass->employees()->count();

        if ($participantsCount > 0) {
            throw ValidationException::withMessages([
                'class' => 'Kelas tidak bisa dihapus karena masih memiliki '.$participantsCount.' peserta.',
            ]);
        }

        $mandatoryTrainingClass->delete();

        return back()->with('success', 'Kelas berhasil dihapus.');
    }

    public function moveEmployee(
        MoveEmployeeToClassRequest $request,
        Employee $employee,
    ): RedirectResponse {
        $validated = $request->validated();
        $targetClassId = (int) $validated['mandatory_training_class_id'];

        if ($employee->mandatory_training_class_id === $targetClassId) {
            return back();
        }

        $currentCount = Employee::query()
            ->where('mandatory_training_class_id', $targetClassId)
            ->count();

        if ($currentCount >= self::MAX_PARTICIPANTS_PER_CLASS) {
            throw ValidationException::withMessages([
                'mandatory_training_class_id' => 'Kelas tujuan sudah penuh (maksimal '.self::MAX_PARTICIPANTS_PER_CLASS.' peserta).',
            ]);
        }

        $employee->update([
            'mandatory_training_class_id' => $targetClassId,
        ]);

        return back()->with('success', 'Peserta berhasil dipindahkan ke kelas tujuan.');
    }
}
