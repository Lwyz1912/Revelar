import { navItems } from "@/config/navigation";
import type { AppSection } from "@/types/revelar";

type SidebarProps = {
  activeNav: AppSection;
  onNavigate: (label: AppSection) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onToast: (message: string) => void;
};

export function Sidebar({
  activeNav,
  onNavigate,
  onOpenHelp,
  onOpenSettings,
  onToast,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="/brand/revelar-logo-horizontal.svg" alt="Revelar." />
        <span>Fotografia & gestão</span>
      </div>
      <nav className="side-nav" aria-label="Navegação principal">
        <p>PRINCIPAL</p>
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.label}
            className={activeNav === item.label ? "active" : ""}
            onClick={() => onNavigate(item.label)}
            type="button"
            aria-current={activeNav === item.label ? "page" : undefined}
          >
            <img src={item.icon} alt="" />
            {item.label}
          </button>
        ))}
        <p className="nav-group">GESTÃO</p>
        {navItems.slice(4).map((item) => (
          <button
            key={item.label}
            className={`${activeNav === item.label ? "active" : ""} ${!item.available ? "planned" : ""}`}
            onClick={() => onNavigate(item.label)}
            type="button"
            aria-current={activeNav === item.label ? "page" : undefined}
          >
            <img src={item.icon} alt="" />
            <span>{item.label}</span>
            {!item.available && <small className="nav-status">Em breve</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button type="button" onClick={onOpenHelp}>
          <span className="help-glyph" aria-hidden="true">
            ?
          </span>
          Como usar o Revelar.
        </button>
        <button type="button" onClick={onOpenSettings}>
          <img src="/brand/revelar-icons-svg-monocromatico/13-configuracoes.svg" alt="" />
          Configurações
        </button>
        <button className="profile" type="button" onClick={() => onToast("Perfil da Maryana")}>
          <span className="avatar">M</span>
          <span>
            <strong>Maryana</strong>
            <small>Fotógrafa</small>
          </span>
          <b>›</b>
        </button>
      </div>
    </aside>
  );
}
