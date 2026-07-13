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
        if (! Schema::hasTable('employee_avsec_archives')) {
            Schema::create('employee_avsec_archives', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
                $table->string('nik')->nullable();
                $table->string('name')->nullable();
                $table->string('place_of_birth')->nullable();
                $table->date('date_of_birth')->nullable();
                $table->string('position')->nullable();
                $table->string('pg')->nullable();
                $table->string('unit')->nullable();
                $table->string('location')->nullable();
                $table->date('skp_expired')->nullable();
                $table->string('function_category')->nullable();
                $table->string('training_schedule')->nullable();
                $table->string('avsec_category');
                $table->string('photo_jpg')->nullable();
                $table->string('ktp_pdf')->nullable();
                $table->string('competency_certificate')->nullable();
                $table->string('latest_certificate')->nullable();
                $table->string('latest_education_certificate')->nullable();
                $table->string('license_book')->nullable();
                $table->string('curriculum_vitae')->nullable();
                $table->string('skck')->nullable();
                $table->string('background_check')->nullable();
                $table->string('whatsapp_number')->nullable();
                $table->timestamp('archived_at');
                $table->timestamps();
            });

            return;
        }

        Schema::table('employee_avsec_archives', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_avsec_archives', 'nik')) {
                $table->string('nik')->nullable()->after('employee_id');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'name')) {
                $table->string('name')->nullable()->after('nik');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'place_of_birth')) {
                $table->string('place_of_birth')->nullable()->after('name');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('place_of_birth');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'position')) {
                $table->string('position')->nullable()->after('date_of_birth');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'pg')) {
                $table->string('pg')->nullable()->after('position');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'unit')) {
                $table->string('unit')->nullable()->after('pg');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'location')) {
                $table->string('location')->nullable()->after('unit');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'skp_expired')) {
                $table->date('skp_expired')->nullable()->after('location');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'function_category')) {
                $table->string('function_category')->nullable()->after('skp_expired');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'training_schedule')) {
                $table->string('training_schedule')->nullable()->after('function_category');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'photo_jpg')) {
                $table->string('photo_jpg')->nullable()->after('avsec_category');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'ktp_pdf')) {
                $table->string('ktp_pdf')->nullable()->after('photo_jpg');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'competency_certificate')) {
                $table->string('competency_certificate')->nullable()->after('ktp_pdf');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'latest_certificate')) {
                $table->string('latest_certificate')->nullable()->after('competency_certificate');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'latest_education_certificate')) {
                $table->string('latest_education_certificate')->nullable()->after('latest_certificate');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'license_book')) {
                $table->string('license_book')->nullable()->after('latest_education_certificate');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'curriculum_vitae')) {
                $table->string('curriculum_vitae')->nullable()->after('license_book');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'skck')) {
                $table->string('skck')->nullable()->after('curriculum_vitae');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'background_check')) {
                $table->string('background_check')->nullable()->after('skck');
            }

            if (! Schema::hasColumn('employee_avsec_archives', 'whatsapp_number')) {
                $table->string('whatsapp_number')->nullable()->after('background_check');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_avsec_archives');
    }
};
