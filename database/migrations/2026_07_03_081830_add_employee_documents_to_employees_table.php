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
            $table->string('photo_jpg')->nullable()->after('function_category');
            $table->string('ktp_pdf')->nullable()->after('photo_jpg');
            $table->string('initial_avsec_competency_certificate')->nullable()->after('ktp_pdf');
            $table->string('latest_refresher_certificate')->nullable()->after('initial_avsec_competency_certificate');
            $table->string('latest_education_certificate')->nullable()->after('latest_refresher_certificate');
            $table->string('license_book')->nullable()->after('latest_education_certificate');
            $table->string('curriculum_vitae')->nullable()->after('license_book');
            $table->string('skck')->nullable()->after('curriculum_vitae');
            $table->string('background_check')->nullable()->after('skck');
            $table->string('whatsapp_number')->nullable()->after('background_check');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'photo_jpg',
                'ktp_pdf',
                'initial_avsec_competency_certificate',
                'latest_refresher_certificate',
                'latest_education_certificate',
                'license_book',
                'curriculum_vitae',
                'skck',
                'background_check',
                'whatsapp_number',
            ]);
        });
    }
};
