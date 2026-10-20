<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

Artisan::command('chessment:admin-password', function () {
    $password = $this->secret('Nova palavra-passe do painel (mínimo 8 caracteres)');
    if (!$password || strlen($password) < 8) {
        $this->error('A palavra-passe deve ter pelo menos 8 caracteres.');
        return 1;
    }
    DB::table('admins')->updateOrInsert(['id' => 1], ['password' => Hash::make($password), 'updated_at' => now(), 'created_at' => now()]);
    $this->info('Acesso administrativo configurado.');
})->purpose('Configura ou redefine a palavra-passe do painel');
