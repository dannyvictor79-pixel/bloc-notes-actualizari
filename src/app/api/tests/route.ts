import { canAccessPanel, getAppUser, json } from "../../../lib/auth";
import { listPanelsForUser } from "../../../lib/panels";
import { listTestJobs } from "../../../lib/tests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const panelId = url.searchParams.get("panelId");

  let jobs;
  if (panelId) {
    if (!(await canAccessPanel(panelId, user))) {
      return json({ error: "Nu ai acces." }, 403);
    }
    jobs = await listTestJobs(panelId);
  } else if (user.isAdmin) {
    jobs = await listTestJobs();
  } else {
    const panels = await listPanelsForUser(user);
    const all = await Promise.all(panels.map((p) => listTestJobs(p.id)));
    jobs = all.flat().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  return json({
    jobs: jobs.map((j) => ({
      id: j.id,
      panelId: j.panel_id,
      status: j.status,
      appName: j.app_name,
      macAddress: j.mac_address,
      clientName: j.client_name,
      durationHours: j.duration_hours,
      resultNote: j.result_note,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    })),
  });
}
