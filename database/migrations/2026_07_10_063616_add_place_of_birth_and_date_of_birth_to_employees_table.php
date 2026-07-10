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
            $table->string('place_of_birth')->nullable()->after('name');
            $table->date('date_of_birth')->nullable()->after('place_of_birth');

            // Rename columns if they exist
            if (Schema::hasColumn('employees', 'initial_avsec_competency_certificate')) {
                $table->renameColumn('initial_avsec_competency_certificate', 'competency_certificate');
            }
            if (Schema::hasColumn('employees', 'latest_refresher_certificate')) {
                $table->renameColumn('latest_refresher_certificate', 'latest_certificate');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['place_of_birth', 'date_of_birth']);

            // Rename back if they exist
            if (Schema::hasColumn('employees', 'competency_certificate')) {
                $table->renameColumn('competency_certificate', 'initial_avsec_competency_certificate');
            }
            if (Schema::hasColumn('employees', 'latest_certificate')) {
                $table->renameColumn('latest_certificate', 'latest_refresher_certificate');
            }
        });
    }
};
