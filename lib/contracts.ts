type ContractFromQuoteInput = {
  clientName: string;
  quoteTitle: string;
  formattedTotal: string;
};

export function buildContractFromQuote({
  clientName,
  quoteTitle,
  formattedTotal,
}: ContractFromQuoteInput) {
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS E/OU FORNECIMENTO DE PRODUTOS

CONTRATANTE: ${clientName}
CONTRATADA: Maryana Fotografia

1. OBJETO
Itens aprovados no orçamento “${quoteTitle}”.

2. VALOR
Total de ${formattedTotal} conforme condições combinadas.

3. ENTREGA E PRAZOS
Os serviços e produtos serão entregues conforme o cronograma acordado.

4. CANCELAMENTO E ALTERAÇÕES
Mudanças deverão ser registradas por escrito entre as partes.

Assinaturas:

________________________  ________________________`;
}
