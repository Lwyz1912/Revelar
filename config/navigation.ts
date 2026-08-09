import type { AppSection } from "@/types/revelar";

export type NavigationItem = {
  icon: string;
  label: AppSection;
  available: boolean;
};

export const navItems = [
  {
    icon: "/brand/revelar-icons-svg-monocromatico/01-visao-geral.svg",
    label: "Visão geral",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/04-agenda.svg",
    label: "Agenda",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/02-clientes.svg",
    label: "Clientes",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/03-trabalhos.svg",
    label: "Trabalhos",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/10-fotografias.svg",
    label: "Galeria",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/14-temas.svg",
    label: "Presets e edição",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/06-pagamentos.svg",
    label: "Financeiro",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/11-entrega.svg",
    label: "Produtos",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/09-arquivos.svg",
    label: "Orçamentos",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/08-contratos.svg",
    label: "Contratos",
    available: true,
  },
  {
    icon: "/brand/revelar-icons-svg-monocromatico/05-calendario.svg",
    label: "Locais",
    available: false,
  },
] satisfies readonly NavigationItem[];
