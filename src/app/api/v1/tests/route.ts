import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";
import { listTestJobs, runSimulatedTest } from "../../../../lib/tests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;
  const jobs = await listTestJobs(auth.panel.id);
  return json({
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      appName: j.app_name,
      macAddress: j.mac_address,
      clientName: j.client_name,
      durationHours: j.duration_hours,
      resultNote: j.result_note,
      createdAt: j.created_at,
    })),
  });
}

/** Creează un test 24h/48h din Bloc notes (simulat v1). */
export async function POST(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  let body: {
    appName?: string;
    macAddress?: string;
    clientName?: string;
    durationHours?: number;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const durationHours = body.durationHours === 48 ? 48 : 24;
  const result = await runSimulatedTest({
    panelId: auth.panel.id,
    userSub: "bloc-notes",
    command: {
      kind: "test",
      appName: (body.appName ?? "necunoscută").trim() || "necunoscută",
      macAddress: (body.macAddress ?? "").trim().toUpperCase(),
      clientName: (body.clientName ?? "Client").trim() || "Client",
      durationHours,
    },
    rawInput: JSON.stringify(body),
  });

  return json({
    ok: result.job.status === "efectuat",
    job: {
      id: result.job.id,
      status: result.job.status,
      appName: result.job.app_name,
      macAddress: result.job.mac_address,
      clientName: result.job.client_name,
      durationHours: result.job.duration_hours,
      resultNote: result.job.result_note,
    },
    reply: result.reply,
  });
}
