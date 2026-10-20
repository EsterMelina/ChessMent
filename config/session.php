<?php

return [
    'driver' => env('SESSION_DRIVER', 'file'), 'lifetime' => (int) env('SESSION_LIFETIME', 480),
    'expire_on_close' => false, 'encrypt' => (bool) env('SESSION_ENCRYPT', true),
    'files' => storage_path('framework/sessions'), 'connection' => env('SESSION_CONNECTION'),
    'table' => env('SESSION_TABLE', 'sessions'), 'store' => env('SESSION_STORE'),
    'lottery' => [2, 100], 'cookie' => env('SESSION_COOKIE', 'chessment_session'),
    'path' => '/', 'domain' => env('SESSION_DOMAIN'), 'secure' => env('SESSION_SECURE_COOKIE'),
    'http_only' => true, 'same_site' => env('SESSION_SAME_SITE', 'strict'), 'partitioned' => false,
];
