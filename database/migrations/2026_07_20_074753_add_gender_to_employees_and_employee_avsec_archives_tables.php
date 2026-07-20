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
            $table->string('gender')->nullable()->after('date_of_birth');
        });

        Schema::table('employee_avsec_archives', function (Blueprint $table) {
            $table->string('gender')->nullable()->after('date_of_birth');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('gender');
        });

        Schema::table('employee_avsec_archives', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
