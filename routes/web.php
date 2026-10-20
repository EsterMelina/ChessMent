<?php

use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use App\Support\ContentValidator;

Route::get('/api/content', function (Request $request) {
    $record = DB::table('site_content')->where('id', 1)->first();
    abort_unless($record, 503, 'CMS ainda não inicializado. Execute as migrações do Laravel.');
    $data = json_decode($record->body, true, 512, JSON_THROW_ON_ERROR);
    if (!$request->session()->get('chessment_admin')) {
        $data['tournaments'] = array_values(array_filter($data['tournaments'], fn ($t) => $t['status'] !== 'draft'));
    }
    return response()->json(['data' => $data, 'revision' => $record->revision]);
});

Route::get('/api/registrations', function (Request $request) {
    $payload = $request->validate(['tournament_id' => ['required', 'string', 'regex:/^[\w-]{1,100}$/']]);
    $record = DB::table('site_content')->where('id', 1)->first();
    abort_unless($record, 503, 'CMS ainda não inicializado. Execute as migrações do Laravel.');
    $data = json_decode($record->body, true, 512, JSON_THROW_ON_ERROR);
    $tournament = null;
    foreach ($data['tournaments'] as $item) {
        if ($item['id'] === $payload['tournament_id'] && $item['status'] !== 'draft') {
            $tournament = $item;
            break;
        }
    }
    abort_unless($tournament, 404, 'Torneio não encontrado.');
    $entries = DB::table('tournament_registrations')->where('tournament_id', $tournament['id'])
        ->orderBy('id')->get(['name', 'level']);
    return response()->json(['entries' => $entries]);
});

Route::post('/api/registrations', function (Request $request) {
    $rateLimitKey = 'chessment-registration:'.$request->ip();
    if (RateLimiter::tooManyAttempts($rateLimitKey, 20)) {
        return response()->json(['message' => 'Muitas tentativas. Tente novamente dentro de um minuto.'], 429);
    }
    RateLimiter::hit($rateLimitKey, 60);
    $payload = $request->validate([
        'tournament_id' => ['required', 'string', 'regex:/^[\w-]{1,100}$/'],
        'name' => ['required', 'string', 'max:80'],
        'email' => ['required', 'email', 'max:120'],
        'level' => ['required', 'in:Iniciante,Intermédio,Avançado,Profissional'],
    ]);
    $record = DB::table('site_content')->where('id', 1)->first();
    abort_unless($record, 503, 'CMS ainda não inicializado. Execute as migrações do Laravel.');
    $data = json_decode($record->body, true, 512, JSON_THROW_ON_ERROR);
    $tournament = null;
    foreach ($data['tournaments'] as $item) {
        if ($item['id'] === $payload['tournament_id'] && $item['status'] === 'open') {
            $tournament = $item;
            break;
        }
    }
    abort_unless($tournament, 404, 'Este torneio não está a aceitar inscrições.');

    $email = mb_strtolower(trim($payload['email']));
    if (DB::table('tournament_registrations')->where('tournament_id', $tournament['id'])->where('email', $email)->exists()) {
        return response()->json(['message' => 'Este email já está inscrito neste torneio.'], 409);
    }
    try {
        DB::table('tournament_registrations')->insert([
            'tournament_id' => $tournament['id'],
            'name' => trim($payload['name']),
            'email' => $email,
            'level' => $payload['level'],
            'registered_at' => now(),
        ]);
    } catch (QueryException $exception) {
        if ((string) $exception->getCode() === '23000' || (string) ($exception->errorInfo[1] ?? '') === '19') {
            return response()->json(['message' => 'Este email já está inscrito neste torneio.'], 409);
        }
        throw $exception;
    }
    return response()->json(['message' => 'Inscrição confirmada.'], 201);
});

Route::get('/api/session', fn (Request $request) => response()->json([
    'authenticated' => (bool) $request->session()->get('chessment_admin'),
    'csrf' => csrf_token(),
]));

Route::post('/api/login', function (Request $request) {
    $request->validate(['password' => ['required', 'string', 'max:1024']]);
    $key = 'chessment-login:'.$request->ip();
    if (RateLimiter::tooManyAttempts($key, 5)) {
        return response()->json(['error' => 'Demasiadas tentativas. Tente novamente dentro de cinco minutos.'], 429);
    }
    RateLimiter::hit($key, 300);
    $admin = DB::table('admins')->where('id', 1)->first();
    $valid = $admin && ($admin->password !== '' && Hash::check($request->input('password'), $admin->password));
    if (!$valid && $admin && $admin->legacy_salt && $admin->legacy_digest) {
        $legacyHash = hash_pbkdf2('sha256', $request->input('password'), hex2bin($admin->legacy_salt), 600000);
        $valid = hash_equals($admin->legacy_digest, $legacyHash);
        if ($valid) DB::table('admins')->where('id', 1)->update(['password' => Hash::make($request->input('password')), 'legacy_salt' => null, 'legacy_digest' => null, 'updated_at' => now()]);
    }
    if (!$valid) {
        return response()->json(['error' => $admin ? 'Palavra-passe incorrecta.' : 'Configure o acesso com php artisan chessment:admin-password.'], $admin ? 401 : 503);
    }
    RateLimiter::clear($key);
    $request->session()->regenerate();
    $request->session()->put('chessment_admin', true);
    return response()->json(['csrf' => csrf_token()]);
});

Route::post('/api/logout', function (Request $request) {
    $request->session()->forget('chessment_admin');
    $request->session()->regenerateToken();
    return response()->json([]);
});

Route::post('/api/content', function (Request $request) {
    abort_unless($request->session()->get('chessment_admin'), 401, 'A sessão terminou. Entre novamente.');
    $payload = $request->validate(['data' => ['required', 'array'], 'revision' => ['required', 'integer', 'min:1']]);
    $data = $payload['data'];
    array_walk_recursive($data, static function (&$value): void {
        if ($value === null) $value = '';
    });
    ContentValidator::validate($data);
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $updated = DB::table('site_content')->where('id', 1)->where('revision', $payload['revision'])
        ->update(['body' => $json, 'revision' => DB::raw('revision + 1'), 'updated_at' => now()]);
    if (!$updated) return response()->json(['error' => 'Outro utilizador alterou o site. Recarregue antes de guardar.'], 409);
    return response()->json(['revision' => $payload['revision'] + 1]);
});

Route::get('/{path}', function (string $path) {
    $allowed = preg_match('#^(index\.html|aula\.html|html/[\w.-]+\.html|css/[\w.-]+\.css|js/[\w.-]+\.js|public/[\w./-]+)$#', $path);
    abort_unless($allowed, 404);
    $file = realpath(base_path($path));
    $expectedRoot = str_starts_with($path, 'public/') ? realpath(public_path()) : realpath(base_path());
    abort_unless($file && $expectedRoot && str_starts_with($file, $expectedRoot.DIRECTORY_SEPARATOR) && is_file($file), 404);
    $contentType = match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
        'css' => 'text/css; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'html' => 'text/html; charset=UTF-8',
        default => mime_content_type($file) ?: 'application/octet-stream',
    };
    return response()->file($file, ['Content-Type' => $contentType]);
})->where('path', '.+');

Route::get('/', fn () => response()->file(base_path('index.html')));
