-- 084 — Segurança: limite de tamanho e de tipo de arquivo nos buckets de fotos.
-- Hoje qualquer visitante (cadastro rápido) pode enviar arquivo para fotos-locais e fotos-eventos; sem limite, alguém
-- poderia subir arquivos enormes (custo de armazenamento) ou tipos perigosos (HTML, SVG com script, executáveis).
-- Seguro rodar mais de uma vez. NÃO apaga nem altera arquivos já enviados; vale só para os próximos envios.
-- SVG fica de fora de propósito (pode carregar script). Se algum envio legítimo for recusado, aumente o limite aqui.

update storage.buckets
set file_size_limit = 8 * 1024 * 1024,                -- 8 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
where id in ('fotos-locais', 'fotos-eventos', 'fotos-destinos');

update storage.buckets
set file_size_limit = 20 * 1024 * 1024,               -- 20 MB (artes de marketing são maiores)
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
where id = 'arte-marketing';

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,               -- 10 MB (comprovantes: foto ou PDF)
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'documentos-hospedagem';

-- Conferência: deve listar os 5 buckets com limite e tipos.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('fotos-locais', 'fotos-eventos', 'fotos-destinos', 'arte-marketing', 'documentos-hospedagem')
order by id;
