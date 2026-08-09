import type { AvailableSection } from "@/types/revelar";

export type SectionGuide = {
  purpose: string;
  steps: readonly string[];
  tip: string;
};

export const sectionGuides: Record<AvailableSection, SectionGuide> = {
  "Visão geral": {
    purpose: "Veja o que precisa de atenção e escolha a próxima ação sem procurar em vários menus.",
    steps: [
      "Cadastre o cliente quando chegar um novo contato.",
      "Crie um orçamento para uma proposta personalizada ou abra um trabalho já combinado.",
      "Use a Agenda e o Financeiro para acompanhar prazos e pagamentos.",
    ],
    tip: "Os cartões do início são atalhos: toque neles para ir direto à área relacionada.",
  },
  Agenda: {
    purpose: "Reúna sessões, reuniões, entregas, pagamentos e compromissos pessoais.",
    steps: [
      "Escolha mês, semana, dia ou lista.",
      "Use “Novo compromisso” para algo que não veio de um trabalho.",
      "Abra um evento para ver cliente, local, horário e vínculo com o trabalho.",
    ],
    tip: "Etapas dos trabalhos entram automaticamente; não é preciso cadastrá-las duas vezes.",
  },
  Clientes: {
    purpose: "Guarde contatos, datas importantes e o histórico de cada pessoa ou empresa.",
    steps: [
      "Clique em “Novo cliente” e preencha primeiro apenas o essencial.",
      "Use busca e filtros para encontrar uma pessoa ou loja.",
      "Vincule o cliente ao criar um orçamento ou trabalho.",
    ],
    tip: "Informações extras podem ser preenchidas depois; nome e contato bastam para começar.",
  },
  Trabalhos: {
    purpose: "Acompanhe um serviço do planejamento até o pagamento e a entrega.",
    steps: [
      "Crie o trabalho e vincule o cliente.",
      "Avance pelas etapas conforme a produção acontece.",
      "Registre pagamentos, custos, fotos e arquivos dentro da ficha.",
    ],
    tip: "Um orçamento aprovado também pode virar trabalho automaticamente.",
  },
  Galeria: {
    purpose: "Encontre todas as fotos organizadas por cliente, trabalho e etapa.",
    steps: [
      "Abra uma capa para acessar as cinco pastas do trabalho.",
      "Use a demonstração para testar seleção, aprovação e entrega.",
      "Entre no trabalho quando precisar enviar ou configurar arquivos reais.",
    ],
    tip: "Os dados de demonstração são separados e podem ser restaurados a qualquer momento.",
  },
  "Presets e edição": {
    purpose: "Edite fotos com estilos de câmera sem alterar o arquivo original.",
    steps: [
      "Crie um álbum e importe fotos JPG, PNG ou WebP.",
      "Abra a foto, escolha um estilo e ajuste luz, cor e textura.",
      "Salve a receita ou exporte em JPG/PNG.",
    ],
    tip: "Use o álbum de demonstração para experimentar todos os controles sem enviar fotos.",
  },
  Financeiro: {
    purpose: "Entenda de onde o dinheiro veio, para onde foi e o que ainda está pendente.",
    steps: [
      "Escolha Visão geral, Profissional ou Pessoal.",
      "Adicione entradas, saídas ou transferências pelo botão “Lançamento”.",
      "Use categoria e tags para detalhar cada movimentação.",
    ],
    tip: "Custos e recebimentos vinculados aos trabalhos aparecem aqui automaticamente.",
  },
  Produtos: {
    purpose: "Mantenha um catálogo reutilizável com preço-base, opções, entrega e disponibilidade.",
    steps: [
      "Cadastre o produto e escolha fixo, a partir de ou sob consulta.",
      "Adicione variações, promoção e forma de entrega quando necessário.",
      "Venda diretamente ou envie o produto para um orçamento.",
    ],
    tip: "Produtos sob consulta abrem um orçamento, pois o valor final depende da conversa.",
  },
  Orçamentos: {
    purpose: "Monte uma proposta personalizada para um cliente antes de fechar o serviço.",
    steps: [
      "Adicione serviços, produtos, quantidades e desconto.",
      "Defina validade, observações e marque o estado da proposta.",
      "Quando for aprovado, crie o trabalho e o contrato pelos próprios botões.",
    ],
    tip: "Use Produtos para itens com preço recorrente; use Orçamentos para negociações específicas.",
  },
  Contratos: {
    purpose: "Organize documentos e acompanhe manualmente o envio e a assinatura.",
    steps: [
      "Crie a partir de um orçamento ou comece um contrato vazio.",
      "Edite o modelo Revelar. ou envie seu PDF/DOCX.",
      "Atualize o estado até chegar a “Assinado”.",
    ],
    tip: "Nesta fase, o arquivo e o estado ficam salvos neste navegador.",
  },
};
