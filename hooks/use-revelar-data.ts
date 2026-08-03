"use client";

import {
  initialAgendaEvents,
  initialClients,
  initialContracts,
  initialFinanceTransactions,
  initialProducts,
  initialQuotes,
  initialWorks,
} from "@/data/demo";
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
  };
}
