"use client";

import { useMemo, useState } from "react";

import { OpenMap } from "@/components/modules/locations/OpenMap";
import type { PhotoLocation, Work } from "@/types/revelar";

type LocationDraft = Omit<PhotoLocation, "id" | "workIds" | "cover">;
type SearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  country: PhotoLocation["country"] | null;
};

const initialCoordinates: Record<PhotoLocation["country"], [number, number]> = {
  Brasil: [-8.0522, -34.9286],
  Portugal: [38.7223, -9.1393],
};

function blankDraft(country: PhotoLocation["country"]): LocationDraft {
  return {
    name: "",
    city: "",
    country,
    latitude: initialCoordinates[country][0],
    longitude: initialCoordinates[country][1],
    contact: "",
    price: "",
    parking: "",
    accessibility: "",
    bestTime: "",
    notes: "",
  };
}

export function LocationsView({
  locations,
  setLocations,
  works,
  toast,
}: {
  locations: PhotoLocation[];
  setLocations: React.Dispatch<React.SetStateAction<PhotoLocation[]>>;
  works: Work[];
  toast: (message: string) => void;
}) {
  const [country, setCountry] = useState<PhotoLocation["country"]>("Brasil");
  const visible = useMemo(
    () => locations.filter((location) => location.country === country),
    [country, locations],
  );
  const [selectedId, setSelectedId] = useState(visible[0]?.id || locations[0]?.id || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(() => blankDraft("Brasil"));
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const selected = locations.find((location) => location.id === selectedId) || visible[0];
  const selectedWorks = works.filter((work) => selected?.workIds.includes(work.id));
  const dialogOpen = editingId !== null;

  const openCreate = () => {
    setEditingId("new");
    setDraft(blankDraft(country));
    setSearch("");
    setResults([]);
  };

  const openEdit = (location: PhotoLocation) => {
    setEditingId(location.id);
    setDraft({
      name: location.name,
      city: location.city,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      contact: location.contact,
      price: location.price,
      parking: location.parking,
      accessibility: location.accessibility,
      bestTime: location.bestTime,
      notes: location.notes,
    });
    setSearch(location.name);
    setResults([]);
  };

  const findAddress = async () => {
    if (search.trim().length < 3) return;
    setSearching(true);
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(search.trim())}`);
    const data = (await response.json().catch(() => ({ results: [] }))) as {
      results?: SearchResult[];
      error?: string;
    };
    setSearching(false);
    setResults(data.results || []);
    if (!response.ok) toast(data.error || "Não foi possível pesquisar este endereço");
  };

  const selectResult = (result: SearchResult) => {
    const firstPart = result.label.split(",")[0]?.trim() || search.trim();
    setDraft((current) => ({
      ...current,
      name: current.name || firstPart,
      city: result.city || current.city,
      country: result.country || current.country,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
    if (result.country) setCountry(result.country);
    setSearch(result.label);
    setResults([]);
  };

  const saveLocation = () => {
    if (!draft.name.trim() || !draft.city.trim()) return;
    if (editingId === "new") {
      const location: PhotoLocation = {
        id: crypto.randomUUID(),
        ...draft,
        name: draft.name.trim(),
        city: draft.city.trim(),
        cover: "/demo/gallery/ensaio-pessoal.webp",
        workIds: [],
      };
      setLocations((current) => [location, ...current]);
      setSelectedId(location.id);
      setCountry(location.country);
      toast("Local salvo no mapa");
    } else {
      setLocations((current) =>
        current.map((location) =>
          location.id === editingId
            ? { ...location, ...draft, name: draft.name.trim(), city: draft.city.trim() }
            : location,
        ),
      );
      setCountry(draft.country);
      toast("Local atualizado");
    }
    setEditingId(null);
  };

  return (
    <div className="places-view">
      <header className="places-heading">
        <div>
          <p>MEMÓRIAS NO MAPA</p>
          <h1>Locais</h1>
          <span>{locations.length} lugares fotografados · sincronizados pelos trabalhos</span>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>
          ＋ Novo local
        </button>
      </header>
      <div className="places-country-tabs">
        {(["Brasil", "Portugal"] as const).map((item) => (
          <button
            key={item}
            className={country === item ? "active" : ""}
            onClick={() => {
              setCountry(item);
              const first = locations.find((location) => location.country === item);
              if (first) setSelectedId(first.id);
            }}
          >
            {item}
            <b>{locations.filter((location) => location.country === item).length}</b>
          </button>
        ))}
      </div>
      <div className="places-layout">
        <section className="places-map-shell" aria-label={`Mapa de ${country}`}>
          <OpenMap locations={visible} selectedId={selected?.id} onSelect={setSelectedId} />
          <div className="map-provider-note">Mapa aberto · OpenStreetMap</div>
        </section>
        <aside className="place-panel">
          {selected ? (
            <>
              <img src={selected.cover} alt="" />
              <div className="place-panel-copy">
                <small>
                  {selected.city} · {selected.country}
                </small>
                <h2>{selected.name}</h2>
                <p>{selected.notes || "Sem observações cadastradas."}</p>
              </div>
              <div className="place-panel-actions">
                <button type="button" onClick={() => openEdit(selected)}>
                  Editar local
                </button>
                <button
                  className="danger-action"
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Excluir ${selected.name} do mapa?`)) return;
                    setLocations((current) => current.filter((item) => item.id !== selected.id));
                    setSelectedId(visible.find((item) => item.id !== selected.id)?.id || "");
                    toast("Local removido do mapa");
                  }}
                >
                  Excluir
                </button>
              </div>
              <dl>
                <div>
                  <dt>Melhor horário</dt>
                  <dd>{selected.bestTime || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Preço</dt>
                  <dd>{selected.price || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Estacionamento</dt>
                  <dd>{selected.parking || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Acessibilidade</dt>
                  <dd>{selected.accessibility || "Não informada"}</dd>
                </div>
                <div>
                  <dt>Contato</dt>
                  <dd>{selected.contact || "Não informado"}</dd>
                </div>
              </dl>
              <div className="place-work-list">
                <span>TRABALHOS NESTE LOCAL</span>
                {selectedWorks.length ? (
                  selectedWorks.map((work) => (
                    <article key={work.id}>
                      <strong>{work.title}</strong>
                      <small>
                        {work.category} · {work.date}
                      </small>
                    </article>
                  ))
                ) : (
                  <p>Nenhum trabalho vinculado.</p>
                )}
              </div>
            </>
          ) : (
            <div className="places-empty">
              Os locais dos trabalhos aparecerão aqui automaticamente.
            </div>
          )}
        </aside>
      </div>
      {dialogOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setEditingId(null)}>
          <form
            className="place-dialog place-map-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveLocation();
            }}
          >
            <button className="close" type="button" onClick={() => setEditingId(null)}>
              ×
            </button>
            <span>{editingId === "new" ? "NOVO LOCAL" : "EDITAR LOCAL"}</span>
            <h2>{editingId === "new" ? "Guardar um lugar" : draft.name}</h2>
            <div className="location-search-box">
              <label>
                Pesquisar endereço ou lugar
                <span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void findAddress();
                      }
                    }}
                    placeholder="Ex.: Praia de Pajuçara, Maceió"
                  />
                  <button type="button" onClick={() => void findAddress()} disabled={searching}>
                    {searching ? "Buscando…" : "Buscar"}
                  </button>
                </span>
              </label>
              {results.length > 0 && (
                <div className="location-search-results">
                  {results.map((result) => (
                    <button type="button" key={result.id} onClick={() => selectResult(result)}>
                      <strong>{result.label.split(",")[0]}</strong>
                      <small>{result.label}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <OpenMap
              compact
              locations={[]}
              editablePosition={{ latitude: draft.latitude, longitude: draft.longitude }}
              onPositionChange={(position) => setDraft((current) => ({ ...current, ...position }))}
            />
            <small className="map-edit-hint">
              Arraste o pino ou toque no mapa para ajustar o ponto exato.
            </small>
            <div className="place-form-grid">
              <label>
                Nome
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Cidade
                <input
                  value={draft.city}
                  onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                  required
                />
              </label>
              <label>
                País
                <select
                  value={draft.country}
                  onChange={(event) =>
                    setDraft({ ...draft, country: event.target.value as PhotoLocation["country"] })
                  }
                >
                  <option>Brasil</option>
                  <option>Portugal</option>
                </select>
              </label>
              <label>
                Melhor horário
                <input
                  value={draft.bestTime}
                  onChange={(event) => setDraft({ ...draft, bestTime: event.target.value })}
                />
              </label>
              <label>
                Latitude
                <input
                  value={draft.latitude}
                  onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })}
                  type="number"
                  step="any"
                  required
                />
              </label>
              <label>
                Longitude
                <input
                  value={draft.longitude}
                  onChange={(event) =>
                    setDraft({ ...draft, longitude: Number(event.target.value) })
                  }
                  type="number"
                  step="any"
                  required
                />
              </label>
              <label>
                Contato
                <input
                  value={draft.contact}
                  onChange={(event) => setDraft({ ...draft, contact: event.target.value })}
                />
              </label>
              <label>
                Preço
                <input
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                />
              </label>
              <label>
                Estacionamento
                <input
                  value={draft.parking}
                  onChange={(event) => setDraft({ ...draft, parking: event.target.value })}
                />
              </label>
              <label>
                Acessibilidade
                <input
                  value={draft.accessibility}
                  onChange={(event) => setDraft({ ...draft, accessibility: event.target.value })}
                />
              </label>
            </div>
            <label>
              Observações
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                rows={3}
              />
            </label>
            <button className="primary-button" type="submit">
              Salvar local
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
