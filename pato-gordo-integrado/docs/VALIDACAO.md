# Validação da entrega

Executada em 09/10/2026, no ambiente Windows disponível, com Node 24.21.0.

## Executado e aprovado

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Passou, sem erros TypeScript. |
| `npm run lint` | Passou, zero erros. Dez avisos de `react-refresh/only-export-components`, em componentes/utilitários com exportações mistas. |
| `npm test` | 17 testes passaram em 3 arquivos. |
| `npm run test:db` | 15 cenários passaram, executando todas as migrations no PostgreSQL PGlite. |
| `npm run build` | Passou: bundles cliente, SSR e Nitro/Cloudflare gerados. |
| Imagens originais | Sete arquivos recuperados do endereço fornecido e incluídos no projeto. Seus tamanhos coincidem com os metadados do ZIP. |
| Referência publicada | Página original do Lovable aberta e inspecionada no navegador, incluindo estrutura e screenshot da primeira dobra. |

Os testes de aplicação cobrem as três rotas, precisão monetária, limites de validade/desconto, criação/edição/indisponibilidade nos formulários, prévia de produto, envio de campanha ao RPC e identificação de imagens inválidas. Os testes dos formulários substituem a chamada de rede por spies; verificam o contrato e comportamento do formulário, não uma sessão autenticada remota.

Os cenários de banco cobrem leitura pública dos produtos importados; bloqueio de escrita anônima; bloqueio de escalada, upload e alteração por usuário comum; criar/editar/ocultar/indisponibilizar produtos; ocultar categorias; integridade de valores e relações; gravação transacional de campanha e participantes; cálculo do desconto; expiração/agendamento/desativação; rollback em erro; proteção de referências a imagens; auditoria; concessão/revogação de proprietários; proteção do último proprietário; e troca transacional de ordem dos produtos.

No PGlite, Auth e Storage são representados por schemas e papéis de teste para que as **políticas SQL reais** possam ser exercitadas. O teste não executa o serviço Auth do Supabase, emissão/verificação criptográfica de JWT, SMTP ou envio real de objetos pelo serviço Storage.

O build emite avisos do conjunto Vite/Lovable/Nitro herdado sobre `vite-tsconfig-paths`, tempo de plugins e `inlineDynamicImports`. Nenhum impediu o build. As primeiras tentativas de instalação/teste encontraram restrições de cache temporário do sandbox; a instalação e os testes finais foram concluídos com cache/temporários dentro de `work/`. Essas restrições são do ambiente de execução, não requisitos adicionais para uma instalação normal.

## Não executado / pendente de homologação

- **Supabase real:** não foram fornecidos URL/chave de um projeto nem contas de teste. Não foram aplicadas migrations remotas, executados login/logout reais, recuperação por e-mail ou upload/substituição de arquivos pelo Storage remoto.
- **API real:** `scripts/test-live.mjs` foi entregue, mas não executado. Sua execução depende de um projeto de homologação e duas contas previamente configuradas.
- **Responsividade e aparência da versão modificada:** não validadas visualmente em desktop, tablet ou celular. O servidor Vite iniciou, mas o ambiente bloqueou conexões locais (`EACCES`/timeout), inclusive a partir do próprio runtime. Uma prévia isolada foi gerada em `work/`, mas o navegador bloqueou o protocolo `file://`; o bloqueio não foi contornado. Portanto, não existe aprovação visual da versão final nem alegação de teste completo de navegação/teclado no navegador.
- **Deploy, domínio, SMTP, backups e contatos oficiais:** não configurados. WhatsApp e Instagram vieram do código original e precisam ser confirmados pelo restaurante.

## Homologação antes do lançamento

1. Aplicar migrations em um Supabase de testes, configurar Auth/SMTP e cadastrar o primeiro proprietário pelo guia separado.
2. Executar `npm run test:live` nesse projeto. Conferir que usuário anônimo e usuário comum não conseguem alterar dados por chamadas diretas.
3. Em 390 px, 768 px e 1440 px, conferir site, login, navegação lateral, formulários, prévias, carrinho e ausência de rolagem horizontal indevida.
4. Criar um produto, mudar preço, subir/descer na categoria, ocultar e indisponibilizar. Conferir a página pública em uma janela anônima, aguardando até 15 segundos ou retornando o foco à página.
5. Criar campanha com preço e com percentual; conferir início/fim em Brasília e remoção da oferta após o término.
6. Enviar JPG, PNG e WebP; rejeitar arquivo maior que 5 MB e arquivo com extensão renomeada; substituir fotografia e confirmar a nova URL no site.
7. Testar sessão expirada, conta sem autorização, revogação com sessão aberta, logout e recuperação de senha por e-mail no mesmo navegador.
8. Conferir foco visível, operação por teclado, fechamento do carrinho por Escape, preferência de movimento reduzido e leitura dos erros/sucessos por tecnologia assistiva.

O código entregue está integrado e passou nas verificações locais descritas. A aprovação para produção depende dessa homologação externa e visual; não é substituída pelo build ou pelos testes isolados.
