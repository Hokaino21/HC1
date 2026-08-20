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
        Schema::create('mandatory_training_classes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('function_category')->nullable();
            $table->timestamps();

            $table->unique(['name', 'function_category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mandatory_training_classes');
    }
};
