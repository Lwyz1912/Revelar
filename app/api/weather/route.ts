import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

type OpenMeteoResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

function weatherLabel(code: number) {
  if (code === 0) return "Céu limpo";
  if ([1, 2].includes(code)) return "Poucas nuvens";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve";
  if ([95, 96, 99].includes(code)) return "Trovoadas";
  return "Condições variáveis";
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para consultar a previsão." }, { status: 401 });

  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));
  const date = url.searchParams.get("date") || "";
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return Response.json({ error: "Local ou data inválidos." }, { status: 400 });
  }

  const target = new Date(`${date}T12:00:00Z`);
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const daysAhead = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (daysAhead > 15) {
    return Response.json({
      available: false,
      reason: "A previsão confiável ficará disponível 15 dias antes do ensaio.",
    });
  }
  if (daysAhead < -5) {
    return Response.json({ available: false, reason: "Data do ensaio já passou." });
  }

  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", String(latitude));
  endpoint.searchParams.set("longitude", String(longitude));
  endpoint.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
  endpoint.searchParams.set("timezone", "auto");
  endpoint.searchParams.set("start_date", date);
  endpoint.searchParams.set("end_date", date);

  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (!response.ok) {
    return Response.json({ available: false, reason: "Previsão temporariamente indisponível." });
  }
  const data = (await response.json()) as OpenMeteoResponse;
  const code = data.daily?.weather_code?.[0];
  if (code === undefined) {
    return Response.json({ available: false, reason: "Previsão ainda não publicada." });
  }
  return Response.json(
    {
      available: true,
      label: weatherLabel(code),
      code,
      max: data.daily?.temperature_2m_max?.[0],
      min: data.daily?.temperature_2m_min?.[0],
      rain: data.daily?.precipitation_probability_max?.[0],
    },
    { headers: { "cache-control": "private, max-age=1800" } },
  );
}
