<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tournament_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('tournament_id', 100);
            $table->string('name', 80);
            $table->string('email', 120);
            $table->string('level', 30);
            $table->timestamp('registered_at');
            $table->unique(['tournament_id', 'email']);
            $table->index(['tournament_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_registrations');
    }
};
