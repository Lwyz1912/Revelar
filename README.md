# Revelar.

Plataforma de gestão criada para a rotina de fotógrafos. O Revelar. reúne
clientes, trabalhos, agenda, finanças, catálogo de produtos, orçamentos e
contratos em uma interface editorial, responsiva e acessível.

## Funcionalidades

- visão geral com prioridades e atalhos para as ações mais comuns;
- clientes pessoais e empresas, com contatos e datas importantes;
- trabalhos com etapas, pagamentos, custos, fotos, arquivos e entrega;
- agenda mensal, semanal, diária e em lista;
- financeiro pessoal e profissional em BRL e EUR;
- entradas, saídas, transferências, categorias, tags e conversão opcional;
- produtos com preço fixo, “a partir de” ou sob consulta;
- variações, disponibilidade, promoções e venda direta;
- orçamentos convertíveis em trabalho e contrato;
- contrato editável ou template próprio em PDF/DOCX;
- temas claros e escuros com cinco paletas;
- ajuda contextual em cada módulo e fluxo inicial guiado.

## Estrutura

```text
app/                  Entradas do App Router e importações globais
components/layout/    Navegação e estrutura do aplicativo
components/modules/   Telas separadas por domínio
components/shared/    Componentes reutilizáveis
config/               Navegação, temas, rótulos, ajuda e contratos
data/                 Dados demonstrativos
hooks/                Preferências e estado persistido
lib/                  Regras de negócio e utilitários testáveis
styles/               Tokens, layout, componentes e módulos
tests/                Testes unitários e validação da renderização
types/                Tipos compartilhados do domínio
public/brand/          Logo, símbolo e família de ícones em SVG
```

`app/page.tsx` apenas inicia a aplicação. A composição fica em
`components/revelar/RevelarApp.tsx`, enquanto cada domínio possui sua própria
pasta em `components/modules/`.

As regras de cálculo não dependem da interface. Finanças, produtos, orçamentos,
datas, contratos e armazenamento ficam em funções isoladas dentro de `lib/`, o
que permite testá-las diretamente.

## Dados e persistência

Nesta fase, os dados ficam no `localStorage` do navegador e não são
compartilhados entre dispositivos. A camada de persistência está isolada em:

- `lib/storage.ts` para leitura e gravação;
- `hooks/use-persisted-state.ts` para integração reativa com a interface;
- `db/` e `.openai/hosting.json` como base para a futura migração para contas,
  login e banco de dados.

## Desenvolvimento

Requisitos:

- Node.js `>= 22.13.0`;
- npm.

```bash
npm ci
npm run dev
```

Principais comandos:

```bash
npm run format       # formata o projeto
npm run format:check # confere a formatação
npm run lint         # regras de qualidade
npm run typecheck    # valida os tipos da aplicação
npm run test:unit    # testes de domínio e persistência
npm run check        # executa todas as verificações rápidas
npm run build        # gera e valida o artefato de produção
npm test             # testes unitários, build e renderização
```

## Tecnologias

- React 19;
- TypeScript;
- Next.js/Vinext;
- Vite;
- Cloudflare Workers/Sites;
- Drizzle ORM preparado para a futura persistência em D1;
- CSS modular por responsabilidade;
- Node Test Runner para os testes de domínio.

## Identidade visual

Os arquivos da marca permanecem independentes e sem Base64 em
`public/brand/`. A logo é adaptada por contraste, mantendo o mesmo desenho em
todas as paletas.

## Estado do projeto

O produto ainda usa dados locais e acompanhamento manual de assinatura. Banco
de dados, contas, login e assinatura digital fazem parte da próxima fase e
podem ser adicionados sem reescrever os módulos atuais.
