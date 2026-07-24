<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropEmployeeUniqueIndexIfExists();

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement(
                'ALTER TABLE `employees` ADD UNIQUE `employees_license_assignment_unique` (`nik`, `function_category`(100), `sub_license`(100), `avsec_category`(100))',
            );

            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->unique(
                ['nik', 'function_category', 'sub_license', 'avsec_category'],
                'employees_license_assignment_unique',
            );
        });
    }

    public function down(): void
    {
        $this->dropEmployeeUniqueIndexIfExists('employees_license_assignment_unique');

        Schema::table('employees', function (Blueprint $table) {
            $table->unique(
                ['nik', 'function_category'],
                'employees_nik_function_category_unique',
            );
        });
    }

    private function dropEmployeeUniqueIndexIfExists(
        ?string $preferredIndexName = null,
    ): void {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            $indexes = collect(DB::select('SHOW INDEX FROM employees'))
                ->filter(fn ($index) => (int) $index->Non_unique === 0)
                ->pluck('Key_name')
                ->unique()
                ->values();

            $indexName = $preferredIndexName;

            if ($indexName === null) {
                $indexName = $indexes->first(
                    fn (string $name): bool => $name !== 'PRIMARY',
                );
            }

            if ($indexName !== null && $indexes->contains($indexName)) {
                DB::statement(
                    sprintf(
                        'ALTER TABLE `employees` DROP INDEX `%s`',
                        $indexName,
                    ),
                );
            }

            return;
        }

        Schema::table('employees', function (Blueprint $table) use (
            $preferredIndexName,
        ) {
            $table->dropUnique(
                $preferredIndexName ?? 'employees_nik_function_category_unique',
            );
        });
    }
};
