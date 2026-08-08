import { drizzle } from "drizzle-orm/d1";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";
import * as schema from "./schema";

export function getDb() {
  return drizzle(getRuntimeBindings().DB, { schema });
}
