import type { AppSection } from "@/types/revelar";
import type { RevelarIconName } from "@/components/shared/RevelarIcon";

export type NavigationItem = {
  icon: RevelarIconName;
  label: AppSection;
  available: boolean;
};

export const navItems = [
  {
    icon: "overview",
    label: "Visão geral",
    available: true,
  },
  {
    icon: "agenda",
    label: "Agenda",
    available: true,
  },
  {
    icon: "clients",
    label: "Clientes",
    available: true,
  },
  {
    icon: "works",
    label: "Trabalhos",
    available: true,
  },
  {
    icon: "gallery",
    label: "Galeria",
    available: true,
  },
  {
    icon: "editing",
    label: "Presets e edição",
    available: true,
  },
  {
    icon: "finance",
    label: "Financeiro",
    available: true,
  },
  {
    icon: "products",
    label: "Produtos",
    available: true,
  },
  {
    icon: "quotes",
    label: "Orçamentos",
    available: true,
  },
  {
    icon: "locations",
    label: "Locais",
    available: true,
  },
  {
    icon: "diary",
    label: "Diário",
    available: true,
  },
  {
    icon: "whatsapp",
    label: "WhatsApp e IA",
    available: true,
  },
] satisfies readonly NavigationItem[];
