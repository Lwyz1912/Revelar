"use client";

import { useState } from "react";

import type { PhotoLocation, Work } from "@/types/revelar";

const regionBounds = {
  Portugal: { minLat: 36.8, maxLat: 42.2, minLng: -9.6, maxLng: -6.1 },
  Brasil: { minLat: -34, maxLat: 5, minLng: -74, maxLng: -34 },
};

function markerPosition(location: PhotoLocation) {
  const bounds = regionBounds[location.country];
  return {
    left: `${Math.max(5, Math.min(95, ((location.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100))}%`,
    top: `${Math.max(5, Math.min(95, (1 - (location.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100))}%`,
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
  const visible = locations.filter((location) => location.country === country);
  const [selectedId, setSelectedId] = useState(visible[0]?.id || locations[0]?.id || "");
  const [creating, setCreating] = useState(false);
  const selected = locations.find((location) => location.id === selectedId) || visible[0];
  const selectedWorks = works.filter((work) => selected?.workIds.includes(work.id));

  return (
    <div className="places-view">
      <header className="places-heading">
        <div>
          <p>MEMÓRIAS NO MAPA</p>
          <h1>Locais</h1>
          <span>{locations.length} lugares fotografados</span>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>
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
        <section
          className={`places-map map-${country.toLowerCase()}`}
          aria-label={`Mapa de ${country}`}
        >
          <div className="map-land">
            <span>{country}</span>
          </div>
          {visible.map((location) => (
            <button
              key={location.id}
              className={selected?.id === location.id ? "active" : ""}
              style={markerPosition(location)}
              onClick={() => setSelectedId(location.id)}
              aria-label={location.name}
            >
              <i>●</i>
              <span>{location.name}</span>
            </button>
          ))}
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
                <p>{selected.notes}</p>
              </div>
              <dl>
                <div>
                  <dt>Melhor horário</dt>
                  <dd>{selected.bestTime}</dd>
                </div>
                <div>
                  <dt>Preço</dt>
                  <dd>{selected.price}</dd>
                </div>
                <div>
                  <dt>Estacionamento</dt>
                  <dd>{selected.parking}</dd>
                </div>
                <div>
                  <dt>Acessibilidade</dt>
                  <dd>{selected.accessibility}</dd>
                </div>
                <div>
                  <dt>Contato</dt>
                  <dd>{selected.contact}</dd>
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
            <div className="places-empty">Adicione o primeiro local.</div>
          )}
        </aside>
      </div>
      {creating && (
        <div className="drawer-backdrop" onMouseDown={() => setCreating(false)}>
          <form
            className="place-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const newLocation: PhotoLocation = {
                id: crypto.randomUUID(),
                name: String(form.get("name")),
                city: String(form.get("city")),
                country: String(form.get("country")) as PhotoLocation["country"],
                latitude: Number(form.get("latitude")),
                longitude: Number(form.get("longitude")),
                contact: String(form.get("contact")),
                price: String(form.get("price")),
                parking: String(form.get("parking")),
                accessibility: String(form.get("accessibility")),
                bestTime: String(form.get("bestTime")),
                notes: String(form.get("notes")),
                cover: "/demo/gallery/ensaio-pessoal.webp",
                workIds: [],
              };
              setLocations((current) => [newLocation, ...current]);
              setCountry(newLocation.country);
              setSelectedId(newLocation.id);
              setCreating(false);
              toast("Local salvo no mapa");
            }}
          >
            <button className="close" type="button" onClick={() => setCreating(false)}>
              ×
            </button>
            <span>NOVO LOCAL</span>
            <h2>Guardar um lugar</h2>
            <div className="place-form-grid">
              <label>
                Nome
                <input name="name" required />
              </label>
              <label>
                Cidade
                <input name="city" required />
              </label>
              <label>
                País
                <select name="country">
                  <option>Brasil</option>
                  <option>Portugal</option>
                </select>
              </label>
              <label>
                Melhor horário
                <input name="bestTime" />
              </label>
              <label>
                Latitude
                <input name="latitude" type="number" step="any" required />
              </label>
              <label>
                Longitude
                <input name="longitude" type="number" step="any" required />
              </label>
              <label>
                Contato
                <input name="contact" />
              </label>
              <label>
                Preço
                <input name="price" />
              </label>
              <label>
                Estacionamento
                <input name="parking" />
              </label>
              <label>
                Acessibilidade
                <input name="accessibility" />
              </label>
            </div>
            <label>
              Observações
              <textarea name="notes" rows={3} />
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
