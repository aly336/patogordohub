# Pato Gordo · site e painel privado

Integração do frontend Lovable existente com Supabase. Mantidos React 19, TypeScript, TanStack Start/Router, Tailwind 4, Framer Motion, componentes Radix/shadcn, identidade visual e o fluxo de pedidos pelo WhatsApp. **Não é uma reescrita do site.**

## Estado da entrega

O código do frontend, painel e backend SQL está integrado. Para operar com dados reais, é necessário criar/conectar um projeto Supabase, aplicar as migrations, configurar Auth/SMTP, cadastrar o primeiro proprietário e publicar o frontend. Nenhum serviço externo foi criado, nenhuma conta real foi cadastrada e nenhum deploy foi feito nesta entrega.

Sem variáveis de ambiente, o site mantém as seções e imagens, mas informa que o cardápio está em configuração. O painel mostra a configuração pendente. Não há autenticação simulada nem dados comerciais falsos como fallback de produção.

## Arquitetura

- `src/routes/index.tsx`: página pública original, agora consumindo o catálogo.
- `src/lib/public-menu.tsx`: uma leitura compartilhada via TanStack Query e RPC `get_catalog`, renovada a cada 15 segundos enquanto a página está ativa, ao recuperar o foco e após alterações no painel da mesma sessão.
- `src/lib/cart.tsx` e `src/components/CartDrawer.tsx`: carrinho original com valores em centavos; revalidação do catálogo antes de encaminhar a mensagem ao WhatsApp.
- `/admin`: login e painel. `/admin/recuperar`: recuperação de senha. Rotas administrativas não renderizam dados privados no SSR.
- `src/components/admin`: formulários, biblioteca de imagens, configurações e autorização de proprietários.
- `supabase/migrations`: banco PostgreSQL, relações, validações, RLS, Storage e funções transacionais.
- `private.owners`: fonte de autorização. Só funções controladas e o SQL Editor podem alterá-la. Metadados do usuário e parâmetros do navegador não concedem privilégios.
- `audit_log`: trilha de inclusões, alterações e exclusões com ator, tabela, ID e horário. Proprietários podem ler, mas não modificar a trilha pela API. Não armazena senhas nem conteúdo pessoal de pedidos.

O Supabase é o backend: Auth valida os tokens e PostgreSQL/RLS autoriza cada operação. O frontend usa somente a chave pública. Não há servidor próprio com service role contornando as políticas.

## Instalação e execução

Use Node.js 22.12+ ou 24 e npm. O `package-lock.json` é o lockfile da entrega.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No PowerShell, substitua a cópia por `Copy-Item .env.example .env.local`. Preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

Use a publishable key, ou a anon key pública legada se aplicável. **Nunca coloque service role, secret key, senha de banco ou senhas de proprietários em variáveis `VITE_*`.** As variáveis são incorporadas ao bundle: configure-as também no ambiente de build da hospedagem e reconstrua ao mudar de projeto Supabase. Alterações de conteúdo pelo painel não precisam de build ou deploy.

## Banco e Storage

Em um projeto Supabase novo, aplique na ordem:

1. `supabase/migrations/202610090001_catalog.sql`
2. `supabase/migrations/202610090002_original_content.sql`
3. `supabase/migrations/202610090003_reorder.sql`

Use migrations com a CLI oficial (`supabase link --project-ref SEU_REF` e `supabase db push`) ou execute cada arquivo inteiro no SQL Editor. Com a CLI, faça `supabase init` se precisar gerar configuração local. As migrations foram desenhadas para uma instalação nova; não reaplique manualmente em um banco com tabelas homônimas. Faça backup antes de atualizar um projeto existente.

O bucket público `restaurant` é criado pela migration. Leitura dos arquivos públicos é liberada; upload, substituição e exclusão exigem proprietário. Só JPG, PNG e WebP até 5 MB são aceitos. O painel verifica assinatura e tamanho, decodifica e converte novas imagens para WebP de até 1600 px. Cada upload recebe nome UUID imutável, evitando cache de foto antiga. Não envie documentos ou imagens confidenciais: este bucket é exclusivamente de fotografias públicas do restaurante.

As sete imagens originais foram recuperadas do domínio informado pelo usuário e incluídas em `public/images`. Os registros `original/...` apontam para esses arquivos locais; novos uploads usam o Storage. As imagens do ZIP em `src/assets/*.asset.json` foram preservadas como referência, mas a aplicação não depende mais do proxy de assets do Lovable.

## Proprietários e recuperação de senha

Siga [PRIMEIRO-PROPRIETARIO.md](docs/PRIMEIRO-PROPRIETARIO.md). Desative cadastro público no Supabase, configure SMTP, Site URL e redirecionamento exato de recuperação. Não há conta/senha padrão. Cada conta precisa existir no Auth, ter e-mail confirmado e ser autorizada como proprietária.

Sessões são gerenciadas pelo SDK Supabase com renovação de token e persistência no navegador. Há logout e recuperação PKCE. Não use computadores compartilhados sem encerrar a sessão. RLS confere a autorização atual no banco em cada chamada, sem depender da duração do token.

## Uso do painel

- **Cardápio:** criar/editar, preço, ingredientes, fotografia, categoria, disponibilidade, publicação, selo, destaque, ordem e prévia. As setas movem um produto dentro de sua categoria de forma transacional. Adicionais também são editáveis nessa seção.
- **Categorias:** nome, ordem e visibilidade. Ocultar a categoria oculta seus produtos. Uma categoria com produtos não pode ser excluída até que sejam movidos.
- **Promoções:** preço original, preço promocional ou percentual inteiro, produtos participantes, imagem, texto, datas e ordem. O horário do formulário é sempre Brasília (UTC−03:00). O preço percentual é calculado no banco com arredondamento para centavos. Campanhas desativadas, futuras ou expiradas não são expostas pela política pública; a página remove campanhas expiradas com base no relógio do servidor.
- **Banners e imagens:** envie, confira a prévia e selecione a imagem nos produtos/campanhas/configurações. Para substituir, envie outra imagem e altere a seleção. Exclua a antiga apenas quando não houver referências. Arquivos originais no repositório permanecem preservados mesmo se seu registro for removido da biblioteca.
- **Configurações:** nome, endereço, WhatsApp, Instagram, horários, texto de destaque, links e fotos das seções originais. Um link de pedidos opcional é usado no CTA principal; o carrinho continua sendo encaminhado ao WhatsApp.
- **Administradores:** autorizar/revogar contas confirmadas já existentes. Não permite cadastro público nem remoção do último proprietário.

Os 11 hambúrgueres, 3 adicionais e as categorias originais foram importados. Também foram acrescentadas as categorias editáveis Combos, Porções, Bebidas e Sobremesas, inicialmente sem produtos. O combo antigo tinha apenas “consultar valor”, sem preço conhecido, e as duas artes promocionais não tinham período nem preço original suficientes para cadastrar descontos válidos: suas imagens permanecem disponíveis, mas a publicação de novos produtos/campanhas depende dos valores reais do proprietário. Nenhum preço ou prazo foi inventado.

WhatsApp e Instagram foram copiados exatamente do código original, não verificados como contatos oficiais. Confirme-os antes da publicação. O endereço é o fornecido no pedido. Os horários continuam sem informação inventada. Avaliação e texto institucional da página foram preservados do frontend original; revise sua atualidade antes do lançamento.

Promoções são campanhas para consulta pelo WhatsApp; não são aplicadas automaticamente ao carrinho, pois podem representar combos/grupos. O pedido por WhatsApp é uma solicitação, não pagamento ou venda confirmada. Valores e disponibilidade finais são confirmados pelo restaurante. Não foi adicionado processamento de pagamento ou banco de pedidos.

## Verificações

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

`test:db` executa as migrations em PostgreSQL embarcado (PGlite), com estruturas de teste para Auth/Storage. Exercita RLS, validações, autorização, promoções e referências reais do banco, mas não o serviço de autenticação nem transferência real de arquivos pela rede.

Para homologar em um Supabase de testes conectado, configure em variáveis de ambiente do terminal os nomes abaixo (não use prefixo `VITE_`, não versionar valores) e execute `npm run test:live`:

```text
TEST_SUPABASE_URL
TEST_SUPABASE_PUBLIC_KEY
TEST_OWNER_EMAIL
TEST_OWNER_PASSWORD
TEST_MEMBER_EMAIL
TEST_MEMBER_PASSWORD
TEST_ALLOW_WRITES=true
```

As duas contas devem existir; só a primeira deve ser proprietária. O teste cria registros isolados com UUIDs novos, verifica API pública/autenticada, uploads e substituição, e limpa somente seus próprios registros. Não usa service role. Use um projeto de homologação e verifique qualquer falha de limpeza reportada.

O resultado realmente executado nesta entrega está em [VALIDACAO.md](docs/VALIDACAO.md). Não considere os testes locais prova de um projeto Supabase remoto que ainda não foi configurado.

## Publicação

O `vite.config.ts` original foi mantido. O preset padrão do build é Cloudflare Worker via Nitro, conforme o projeto Lovable. Configure as duas variáveis públicas no build, execute `npm ci && npm run build` e publique pela integração Lovable ou com o fluxo Nitro/Cloudflare da hospedagem. `npm run preview` permite conferir o artefato local quando o ambiente permite conexões loopback. O próprio build gera a configuração de deploy; confira o domínio e a conta de destino antes de publicar.

Para outro provedor, escolha o preset Nitro correspondente, por exemplo `nitro: { preset: "node-server" }` na configuração existente. **Não envie apenas `.output/public` para um host estático**: o aplicativo utiliza TanStack Start/SSR e precisa do runtime gerado, inclusive para acesso direto a `/admin` e `/admin/recuperar`.

Na hospedagem, use HTTPS, mantenha os headers de segurança e não armazene HTML administrativo em cache compartilhado. O wrapper SSR acrescenta `nosniff`, política de referenciador, restrição de recursos e `no-store` nas páginas administrativas. Configure backups do banco e retenção/backup de Storage conforme a operação do restaurante. Antes de divulgar o domínio, execute os testes de API reais, recuperação de senha por e-mail e navegação em desktop/celular.

## Referências técnicas

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase — recuperação de senha](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
