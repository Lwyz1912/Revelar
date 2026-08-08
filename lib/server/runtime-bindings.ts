import { AsyncLocalStorage } from "node:async_hooks";

export type RuntimeBindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const runtimeBindings = new AsyncLocalStorage<RuntimeBindings>();

export function withRuntimeBindings<T>(bindings: RuntimeBindings, callback: () => T): T {
  return runtimeBindings.run(bindings, callback);
}

export function getRuntimeBindings() {
  const bindings = runtimeBindings.getStore();
  if (!bindings) {
    throw new Error("Os serviços privados da galeria não estão disponíveis nesta requisição.");
  }
  return bindings;
}
