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
            $table->string('sub_license')->nullable()->after('function_category');
        });

        Schema::table('employee_avsec_archives', function (Blueprint $table) {
            $table->string('sub_license')->nullable()->after('function_category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('sub_license');
        });

        Schema::table('employee_avsec_archives', function (Blueprint $table) {
            $table->dropColumn('sub_license');
        });
    }
};
