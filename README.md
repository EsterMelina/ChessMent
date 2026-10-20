# ChessMent

O site mantém HTML, CSS e JavaScript sem ferramentas de compilação. O painel CMS usa Laravel 12, PHP 8.2+ e SQLite.

## Iniciar o site e o painel

Na pasta do projecto, instale as dependências e configure o Laravel:

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --force
```

Se esta for uma instalação nova, configure a palavra-passe com `php artisan chessment:admin-password` (mínimo de 8 caracteres). A migração de uma instalação Python existente importa o conteúdo e converte a palavra-passe antiga na primeira autenticação. Depois execute:

```powershell
php artisan serve
```

- Site: http://localhost:8000
- Painel: http://localhost:8000/html/admin.html (também acessível no rodapé)

Entre com a palavra-passe configurada. O responsável pelos conteúdos não precisa de editar código. Para redefinir a palavra-passe, execute novamente `php artisan chessment:admin-password`.

## Gerir conteúdos

- **Torneios:** criar, editar e eliminar; nome, descrição, categoria, local, ligação opcional de incorporação do Google Maps, data, hora, preço e imagem. Novos torneios começam como rascunho. Seleccione “Inscrições abertas” para os mostrar no site ou “Encerrado” para os manter visíveis sem aceitar inscrições. O ícone de olho abre o mapa dentro da página; sem ligação personalizada, pesquisa o endereço indicado.
- **Galeria:** carregar fotografias JPG, PNG ou WebP; editar títulos, descrições acessíveis e créditos. Fotografias até 10 MB são redimensionadas no navegador antes de guardar.
- **Textos e contactos:** editar os textos existentes do início, aulas, sobre nós, torneios, galeria, vídeo e contactos. O vídeo usa o formato `https://www.youtube-nocookie.com/embed/ID_DO_VIDEO` (ID de 11 caracteres).
- Clique em **Guardar alterações** para publicar e abra **Ver o site** para verificar. Recarregue uma página pública já aberta para ver as alterações. A eliminação pede confirmação. Alterações simultâneas são detectadas para evitar substituições silenciosas.

Os conteúdos são partilhados entre navegadores pelo servidor. Os dados e o hash da palavra-passe ficam em `database/database.sqlite`; faça cópias de segurança desse ficheiro. `public/content.json` contém os conteúdos iniciais usados na primeira migração. As imagens carregadas ficam na base de dados; o limite de uma gravação é 25 MB.

**Inscrições:** são guardadas no SQLite do servidor e partilhadas entre visitantes. O email é usado apenas para impedir inscrições duplicadas no mesmo torneio; a lista pública mostra somente nome e nível. Renomear um torneio pelo painel mantém as inscrições associadas ao identificador do torneio.

## Alojamento

Abrir os HTML directamente ou usar apenas Live Server não permite guardar alterações no painel. Use o servidor acima. Não basta alojar os ficheiros num serviço exclusivamente estático.

Para acesso público, publique a aplicação Laravel num servidor com armazenamento persistente e HTTPS. Configure `APP_URL`, `APP_KEY`, permissões de escrita em `storage` e `bootstrap/cache`, e mantenha `database/database.sqlite` fora da área pública.

O acesso de gestão usa uma palavra-passe partilhada, sessão de oito horas, cookie HttpOnly/SameSite, protecção CSRF e limitação de tentativas. Reiniciar o processo termina as sessões. Para vários administradores com permissões diferentes, acrescente contas individuais antes dessa utilização.

## Verificação

```powershell
php artisan route:list
node --check js/admin.js
node --check js/content.js
node --check js/galeria.js
node --check js/inscricoes.js
```
