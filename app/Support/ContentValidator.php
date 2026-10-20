<?php

namespace App\Support;

class ContentValidator
{
    public static function validate(array $data): void
    {
        $seed = json_decode(file_get_contents(base_path('public/content.json')), true, 512, JSON_THROW_ON_ERROR);
        self::sameKeys($data, $seed, 'Conteúdo inválido.');
        foreach (['tournaments', 'photos'] as $collection) {
            if (!is_array($data[$collection]) || count($data[$collection]) > 150) abort(422, 'Limite de 150 elementos por secção.');
            $ids = [];
            foreach ($data[$collection] as $item) {
                if (!is_array($item)) abort(422, 'Elemento inválido.');
                $fields = $collection === 'tournaments' ? ['id','name','description','category','date','time','location','fee','image','status','registrationKey'] : ['id','title','alt','src','photographer','source','license','licenseUrl'];
                if ($collection === 'tournaments' && array_key_exists('mapUrl', $item)) $fields[] = 'mapUrl';
                self::sameKeys($item, array_fill_keys($fields, true), 'Campos inválidos.');
                foreach ($item as $key => $value) {
                    if ($key === ($collection === 'tournaments' ? 'image' : 'src')) self::image($value);
                    else self::string($value, 5000, in_array($key, $collection === 'tournaments' ? ['id','name','category','location','registrationKey'] : ['id','title','alt'], true));
                }
                if (!preg_match('/^[\w-]{1,100}$/', $item['id']) || isset($ids[$item['id']])) abort(422, 'Identificador duplicado ou inválido.');
                $ids[$item['id']] = true;
                if ($collection === 'tournaments') {
                    if (!in_array($item['status'], ['draft','open','closed'], true)) abort(422, 'Estado inválido.');
                    if ($item['date'] !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $item['date']) || !checkdate((int)substr($item['date'],5,2), (int)substr($item['date'],8,2), (int)substr($item['date'],0,4)))) abort(422, 'Data inválida.');
                    if ($item['time'] !== '' && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $item['time'])) abort(422, 'Hora inválida.');
                    if (isset($item['mapUrl']) && $item['mapUrl'] !== '') {
                        $map = parse_url($item['mapUrl']);
                        if (($map['scheme'] ?? '') !== 'https' || !in_array($map['host'] ?? '', ['www.google.com', 'maps.google.com'], true) || !preg_match('#^/maps/embed/?$#', $map['path'] ?? '')) abort(422, 'Use o URL HTTPS de incorporação do Google Maps.');
                    }
                } else {
                    if ($item['src'] === '') abort(422, 'Escolha uma fotografia.');
                    foreach (['source','licenseUrl'] as $key) if ($item[$key] !== '' && !str_starts_with($item[$key], 'https://')) abort(422, 'Use ligações HTTPS para os créditos.');
                }
            }
        }
        if (!is_array($data['pages'])) abort(422, 'Páginas inválidas.');
        self::sameKeys($data['pages'], $seed['pages'], 'Páginas inválidas.');
        foreach ($seed['pages'] as $page => $fields) {
            self::sameKeys($data['pages'][$page], $fields, 'Campos da página inválidos.');
            foreach ($fields as $key => $field) {
                $value = $data['pages'][$page][$key];
                    if (!is_array($value)) abort(422, "Campo inválido: {$page}.{$key} tem uma estrutura incorrecta.");
                    if (($value['kind'] ?? null) !== $field['kind']) abort(422, "Campo inválido: o tipo de {$page}.{$key} não corresponde ao esperado.");
                    self::sameKeys($value, $field, "Campo inválido: a estrutura de {$page}.{$key} está incompleta ou contém campos desconhecidos.");
                    self::string($value['label'] ?? null, 500, true);
                if ($field['kind'] === 'image') self::image($value['value']);
                else {
                    self::string($value['value'], 5000, true);
                    if ($field['kind'] === 'url' && !str_starts_with($value['value'], 'https://')) abort(422, 'Use uma ligação HTTPS.');
                    if ($field['kind'] === 'video' && !preg_match('#^https://www\.youtube-nocookie\.com/embed/[\w-]{11}$#', $value['value'])) abort(422, 'Use uma ligação de incorporação YouTube válida.');
                }
            }
        }
    }

    private static function sameKeys(array $value, array $shape, string $message): void
    {
        if (array_diff(array_keys($value), array_keys($shape)) || array_diff(array_keys($shape), array_keys($value))) abort(422, $message);
    }

    private static function string(mixed $value, int $limit = 5000, bool $required = false): void
    {
        if (!is_string($value) || mb_strlen($value) > $limit || ($required && trim($value) === '')) abort(422, 'Preencha os campos obrigatórios e respeite os limites de texto.');
    }

    private static function image(mixed $value): void
    {
        self::string($value, 3_000_000);
        if ($value === '') return;
        if (preg_match('#^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#', $value, $m)) {
            $raw = base64_decode($m[2], true);
            $valid = $raw !== false && (($m[1] === 'png' && str_starts_with($raw, "\x89PNG\r\n\x1a\n")) || ($m[1] === 'jpeg' && str_starts_with($raw, "\xff\xd8\xff")) || ($m[1] === 'webp' && str_starts_with($raw, 'RIFF') && substr($raw, 8, 4) === 'WEBP'));
            if (!$valid || strlen($raw) > 2_000_000) abort(422, 'Imagem inválida ou superior a 2 MB.');
        } elseif (!preg_match('#^public/img/[\w. -]+$#u', $value) && !str_starts_with($value, 'https://')) abort(422, 'Endereço de imagem inválido.');
    }
}
