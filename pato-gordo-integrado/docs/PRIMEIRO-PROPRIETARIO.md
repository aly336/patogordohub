# Primeiro proprietário e novas autorizações

Não existe senha padrão, cadastro público de administradores ou chave privilegiada no frontend.

## Preparação do Supabase

1. Aplique todas as migrations na ordem indicada no README.
2. Em Authentication, desabilite **Allow new users to sign up**. Mantenha somente os provedores de autenticação necessários. O aplicativo usa e-mail e senha.
3. Configure o Site URL com o domínio final HTTPS. Na lista de redirecionamentos, inclua exatamente `https://SEU-DOMINIO/admin/recuperar` (e o equivalente localhost somente durante desenvolvimento). Não use curingas amplos em produção.
4. Configure SMTP próprio, limites de envio/tentativas e política de senhas de ao menos 12 caracteres. Ative proteção contra senhas vazadas se disponível no plano. Faça um teste real de entrega do e-mail antes de lançar o site.

## Criar a primeira conta

No painel confiável do Supabase, abra Authentication → Users e crie/convide a conta do proprietário. Use o e-mail real, confirme sua posse por um canal conhecido e conclua a confirmação de e-mail. Para estabelecer a senha, prefira o fluxo de recuperação em `/admin`: o próprio proprietário define sua senha, sem enviá-la a desenvolvedores ou ao chat. Como o fluxo usa PKCE, o link precisa ser aberto no navegador que solicitou a recuperação.

Copie o **UUID do usuário** exibido no Supabase Auth. Execute o seguinte apenas no SQL Editor do Supabase, com acesso administrativo ao projeto, substituindo o marcador pelo UUID conferido:

```sql
begin;
insert into private.owners (user_id)
select id from auth.users
where id = 'UUID-DO-PROPRIETARIO'::uuid
  and email_confirmed_at is not null
on conflict do nothing;

-- Confira exatamente a conta esperada antes de concluir.
select o.user_id, u.email, o.created_at
from private.owners o join auth.users u on u.id = o.user_id;
commit;
```

Se nenhuma linha foi inserida, confira o UUID e a confirmação de e-mail. Não substitua a verificação por um papel armazenado em `user_metadata`: o próprio usuário pode alterar esse campo.

Entre em `/admin` com essa conta. O aplicativo verifica a sessão no Supabase Auth e consulta `is_owner()`. Toda gravação continua sujeita a RLS, independentemente da interface.

## Autorizar outro proprietário

1. Crie/convide e confirme a conta pelo Supabase Auth, como acima. O cadastro público permanece desativado.
2. Um proprietário atual entra no painel → **Administradores autorizados** e informa o e-mail exato da conta confirmada.
3. A função `set_owner` confere o chamador no banco e registra a alteração. Informar um e-mail pelo navegador ou adulterar uma requisição sem já ser proprietário não concede acesso.
4. Para remover acesso, use **Revogar acesso**. A autorização deixa de existir imediatamente no banco, inclusive com um token antigo ainda válido. A interface reconfere a autorização a cada 30 segundos e ao voltar à janela. A última conta proprietária não pode ser removida pelo painel.

Não desative uma conta no Auth sem também revisar suas autorizações em `private.owners`. Para incidentes, revogue a autorização, encerre sessões no Auth e revise `audit_log`. Desativar acesso ao painel não apaga a conta do Auth; a exclusão é uma ação separada do responsável pelo Supabase.

## Recuperação administrativa

Se todos perderem acesso, um responsável com acesso confiável ao projeto Supabase pode recuperar a conta e inserir um novo UUID confirmado pelo SQL Editor. Esse acesso ao projeto é a raiz de confiança e deve ser protegido com MFA e compartilhado apenas com os responsáveis. Nenhuma service role key é necessária para o navegador ou para o site.
