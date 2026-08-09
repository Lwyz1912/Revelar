"use client";

import { useEffect, useRef, useState } from "react";

import {
  initialAgendaEvents,
  initialClients,
  initialContracts,
  initialFinanceTransactions,
  initialProducts,
  initialQuotes,
  initialWorks,
} from "@/data/demo";
import { initialDiaryEntries, initialLocations } from "@/data/story";
import { useStoredJsonState } from "@/hooks/use-persisted-state";
import { storageKeys } from "@/lib/storage";
import type {
  AgendaEvent,
  Client,
  Contract,
  FinanceTransaction,
  Product,
  Quote,
  Work,
  DiaryEntry,
  PhotoLocation,
  AchievementUnlock,
} from "@/types/revelar";

export function useRevelarData() {
  const [clients, setClients] = useStoredJsonState<Client[]>(storageKeys.clients, initialClients);
  const [works, setWorks] = useStoredJsonState<Work[]>(storageKeys.works, initialWorks);
  const [agendaEvents, setAgendaEvents] = useStoredJsonState<AgendaEvent[]>(
    storageKeys.agendaEvents,
    initialAgendaEvents,
  );
  const [transactions, setTransactions] = useStoredJsonState<FinanceTransaction[]>(
    storageKeys.transactions,
    initialFinanceTransactions,
  );
  const [products, setProducts] = useStoredJsonState<Product[]>(
    storageKeys.products,
    initialProducts,
  );
  const [quotes, setQuotes] = useStoredJsonState<Quote[]>(storageKeys.quotes, initialQuotes);
  const [contracts, setContracts] = useStoredJsonState<Contract[]>(
    storageKeys.contracts,
    initialContracts,
  );
  const [locations, setLocations] = useStoredJsonState<PhotoLocation[]>(
    storageKeys.locations,
    initialLocations,
  );
  const [diaryEntries, setDiaryEntries] = useStoredJsonState<DiaryEntry[]>(
    storageKeys.diary,
    initialDiaryEntries,
  );
  const [achievementUnlocks, setAchievementUnlocks] = useStoredJsonState<AchievementUnlock[]>(
    storageKeys.achievementUnlocks,
    [],
  );
  const [cloudReady, setCloudReady] = useState(false);
  const locatingWorks = useRef(new Set<number>());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/app-data")
      .then(
        async (response): Promise<{ data?: unknown } | null> =>
          response.ok ? ((await response.json()) as { data?: unknown }) : null,
      )
      .then((result) => {
        if (cancelled || !result?.data) return;
        const data = result.data as Partial<{
          clients: Client[];
          works: Work[];
          agendaEvents: AgendaEvent[];
          transactions: FinanceTransaction[];
          products: Product[];
          quotes: Quote[];
          contracts: Contract[];
          locations: PhotoLocation[];
          diaryEntries: DiaryEntry[];
          achievementUnlocks: AchievementUnlock[];
        }>;
        if (Array.isArray(data.clients)) setClients(data.clients);
        if (Array.isArray(data.works)) setWorks(data.works);
        if (Array.isArray(data.agendaEvents)) setAgendaEvents(data.agendaEvents);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.quotes)) setQuotes(data.quotes);
        if (Array.isArray(data.contracts)) setContracts(data.contracts);
        if (Array.isArray(data.locations)) setLocations(data.locations);
        if (Array.isArray(data.diaryEntries)) setDiaryEntries(data.diaryEntries);
        if (Array.isArray(data.achievementUnlocks)) setAchievementUnlocks(data.achievementUnlocks);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCloudReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    setAgendaEvents,
    setClients,
    setContracts,
    setDiaryEntries,
    setLocations,
    setProducts,
    setQuotes,
    setTransactions,
    setWorks,
    setAchievementUnlocks,
  ]);

  useEffect(() => {
    if (!cloudReady) return;
    const timer = window.setTimeout(() => {
      fetch("/api/app-data", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clients,
          works,
          agendaEvents,
          transactions,
          products,
          quotes,
          contracts,
          locations,
          diaryEntries,
          achievementUnlocks,
        }),
      }).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    cloudReady,
    clients,
    works,
    agendaEvents,
    transactions,
    products,
    quotes,
    contracts,
    locations,
    diaryEntries,
    achievementUnlocks,
  ]);

  useEffect(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("pt-BR");
    const missing = works.filter(
      (work) =>
        work.location.trim().length >= 3 &&
        !locations.some((location) => location.workIds.includes(work.id)) &&
        !locatingWorks.current.has(work.id),
    );
    if (!missing.length) return;
    let cancelled = false;
    const activeLocatingWorks = locatingWorks.current;
    missing.forEach((work) => activeLocatingWorks.add(work.id));
    void (async () => {
      for (const work of missing) {
        if (cancelled) break;
        const direct = locations.find((location) => {
          const saved = normalize(`${location.name} ${location.city}`);
          const requested = normalize(work.location);
          return saved.includes(requested) || requested.includes(normalize(location.name));
        });
        if (direct) {
          setLocations((current) =>
            current.map((location) =>
              location.id === direct.id && !location.workIds.includes(work.id)
                ? { ...location, workIds: [...location.workIds, work.id] }
                : location,
            ),
          );
          activeLocatingWorks.delete(work.id);
          continue;
        }
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(work.location)}`).catch(
          () => null,
        );
        const data = response?.ok
          ? ((await response.json()) as {
              results?: Array<{
                latitude: number;
                longitude: number;
                city: string;
                country: PhotoLocation["country"] | null;
              }>;
            })
          : null;
        const found = data?.results?.find((item) => item.country);
        if (found && !cancelled) {
          setLocations((current) => {
            const existing = current.find((location) => {
              const near =
                Math.abs(location.latitude - found.latitude) < 0.0008 &&
                Math.abs(location.longitude - found.longitude) < 0.0008;
              return near || normalize(location.name) === normalize(work.location);
            });
            if (existing) {
              return current.map((location) =>
                location.id === existing.id && !location.workIds.includes(work.id)
                  ? { ...location, workIds: [...location.workIds, work.id] }
                  : location,
              );
            }
            return [
              {
                id: crypto.randomUUID(),
                name: work.location,
                city: found.city || work.location,
                country: found.country!,
                latitude: found.latitude,
                longitude: found.longitude,
                contact: "",
                price: "",
                parking: "",
                accessibility: "",
                bestTime: "",
                notes: `Adicionado automaticamente pelo trabalho “${work.title}”.`,
                cover: "/demo/gallery/ensaio-pessoal.webp",
                workIds: [work.id],
              },
              ...current,
            ];
          });
        }
        activeLocatingWorks.delete(work.id);
      }
    })();
    return () => {
      cancelled = true;
      missing.forEach((work) => activeLocatingWorks.delete(work.id));
    };
  }, [locations, setLocations, works]);

  return {
    clients,
    setClients,
    works,
    setWorks,
    agendaEvents,
    setAgendaEvents,
    transactions,
    setTransactions,
    products,
    setProducts,
    quotes,
    setQuotes,
    contracts,
    setContracts,
    locations,
    setLocations,
    diaryEntries,
    setDiaryEntries,
    achievementUnlocks,
    setAchievementUnlocks,
    cloudReady,
  };
}
