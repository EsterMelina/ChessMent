<?php

return [
    'name' => env('APP_NAME', 'ChessMent'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'Africa/Maputo',
    'locale' => 'pt',
    'fallback_locale' => 'en',
    'faker_locale' => 'pt_PT',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'previous_keys' => [],
    'maintenance' => ['driver' => 'file', 'store' => 'file'],
];
