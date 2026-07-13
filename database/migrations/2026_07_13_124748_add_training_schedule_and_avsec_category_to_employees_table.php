<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'training_schedule')) {
                $table->string('training_schedule')->nullable()->after('function_category');
            }

            if (! Schema::hasColumn('employees', 'avsec_category')) {
                $table->string('avsec_category')->nullable()->after('training_schedule');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('employees', 'training_schedule')) {
                $columns[] = 'training_schedule';
            }

            if (Schema::hasColumn('employees', 'avsec_category')) {
                $columns[] = 'avsec_category';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
