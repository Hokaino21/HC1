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
            $table->foreignId('mandatory_training_class_id')
                ->nullable()
                ->constrained('mandatory_training_classes')
                ->nullOnDelete();

            $table->index('mandatory_training_class_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['mandatory_training_class_id']);
            $table->dropColumn('mandatory_training_class_id');
        });
    }
};
