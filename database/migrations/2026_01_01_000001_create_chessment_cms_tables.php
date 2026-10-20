<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('admins', function (Blueprint $table) {
            $table->id();
            $table->string('password');
            $table->string('legacy_salt')->nullable();
            $table->string('legacy_digest')->nullable();
            $table->timestamps();
        });
        Schema::create('site_content', function (Blueprint $table) {
            $table->id();
            $table->longText('body');
            $table->unsignedBigInteger('revision')->default(1);
            $table->timestamps();
        });
        $seed = file_get_contents(base_path('public/content.json'));
        $legacyPath = base_path('data/chessment.db');
        if (is_file($legacyPath)) {
            try {
                $legacy = new PDO('sqlite:'.$legacyPath);
                $row = $legacy->query('SELECT body FROM content WHERE id=1')->fetch(PDO::FETCH_ASSOC);
                if ($row && is_string($row['body']) && json_decode($row['body']) !== null) $seed = $row['body'];
                $admin = $legacy->query('SELECT salt, digest FROM admin WHERE id=1')->fetch(PDO::FETCH_ASSOC);
                if ($admin && preg_match('/^[a-f0-9]{32}$/', $admin['salt']) && preg_match('/^[a-f0-9]{64}$/', $admin['digest'])) {
                    DB::table('admins')->insert(['id' => 1, 'password' => '', 'legacy_salt' => $admin['salt'], 'legacy_digest' => $admin['digest'], 'created_at' => now(), 'updated_at' => now()]);
                }
            } catch (Throwable) {
                // The bundled legacy database can be absent or already removed.
            }
        }
        DB::table('site_content')->insert(['id' => 1, 'body' => $seed, 'revision' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_content');
        Schema::dropIfExists('admins');
    }
};
