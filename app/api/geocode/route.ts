import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para pesquisar locais." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 3) return Response.json({ results: [] });
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  if (normalized.includes("villa jardim") && normalized.includes("caruaru")) {
    return Response.json({
      results: [
        {
          id: "demo-villa-jardim-caruaru",
          label: "Villa Jardim, Caruaru, Pernambuco · localização demonstrativa",
          latitude: -8.2841,
          longitude: -35.9695,
          city: "Caruaru",
          country: "Brasil",
          demo: true,
        },
      ],
    });
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.slice(0, 180));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "pt-BR,pt,en");
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Revelar-app/1.0 (location picker)",
    },
  }).catch(() => null);
  if (!response?.ok)
    return Response.json({ error: "Busca de locais indisponível." }, { status: 502 });
  const data = (await response.json()) as NominatimResult[];
  const results = data.map((item) => {
    const countryCode = item.address?.country_code?.toLowerCase();
    return {
      id: String(item.place_id),
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      city:
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.municipality ||
        item.address?.state ||
        "",
      country: countryCode === "br" ? "Brasil" : countryCode === "pt" ? "Portugal" : null,
    };
  });
  return Response.json({ results }, { headers: { "cache-control": "private, max-age=3600" } });
}
