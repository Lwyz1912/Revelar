import type { Currency, ThemeMode } from "@/types/revelar";

type TopbarProps = {
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  resolvedTheme: "light" | "dark";
  onThemeChange: (theme: ThemeMode) => void;
  searchOpen: boolean;
  onSearchToggle: () => void;
  searchContext: "clients" | "works" | "none";
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenHelp: () => void;
  onToast: (message: string) => void;
};

export function Topbar({
  currency,
  onCurrencyChange,
  resolvedTheme,
  onThemeChange,
  searchOpen,
  onSearchToggle,
  searchContext,
  searchValue,
  onSearchChange,
  onOpenHelp,
  onToast,
}: TopbarProps) {
  const placeholder =
    searchContext === "clients"
      ? "Buscar clientes..."
      : searchContext === "works"
        ? "Buscar trabalhos..."
        : "Busca disponível em Clientes e Trabalhos";

  return (
    <header className="topbar">
      <img className="mobile-logo" src="/brand/revelar-symbol.svg" alt="Revelar." />
      <label className={`search ${searchOpen ? "open" : ""}`}>
        <span className="search-glyph" aria-hidden="true" />
        <input
          aria-label="Buscar no Revelar"
          placeholder={placeholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          readOnly={searchContext === "none"}
          onClick={() => {
            if (searchContext === "none") {
              onToast("Abra Clientes ou Trabalhos para usar a busca");
            }
          }}
        />
      </label>
      <div className="top-actions">
        <button
          className="icon-button mobile-search"
          type="button"
          onClick={onSearchToggle}
          aria-label="Abrir busca"
        >
          <span className="search-glyph" aria-hidden="true" />
        </button>
        <select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value as Currency)}
          aria-label="Moeda"
        >
          <option value="BRL">R$</option>
          <option value="EUR">€</option>
        </select>
        <button
          className="icon-button help-button"
          type="button"
          onClick={onOpenHelp}
          aria-label="Abrir ajuda desta área"
          title="Como usar esta área"
        >
          ?
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={() => onThemeChange(resolvedTheme === "light" ? "dark" : "light")}
          aria-label="Alternar tema"
        >
          <img src="/brand/revelar-icons-svg-monocromatico/14-temas.svg" alt="" />
        </button>
        <button
          className="icon-button notification"
          type="button"
          onClick={() => onToast("Você não tem novas notificações")}
          aria-label="Notificações"
        >
          <img src="/brand/revelar-icons-svg-monocromatico/12-notificacoes.svg" alt="" />
          <i />
        </button>
      </div>
    </header>
  );
}
