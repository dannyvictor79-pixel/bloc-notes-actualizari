import { sql } from "./db";
import { newId } from "./ids";
import { addExpiration } from "./expirations";
import type { TestCommand } from "./commands";

export type TestJob = {
  id: string;
  panel_id: string;
  status: "primit" | "in_lucru" | "efectuat" | "esuat";
  app_name: string;
  mac_address: string;
  client_name: string;
  duration_hours: number;
  raw_input: string;
  result_note: string;
  created_by_sub: string;
  created_at: string;
  updated_at: string;
};

export async function listTestJobs(
  panelId?: string,
): Promise<TestJob[]> {
  if (panelId) {
    return sql<TestJob>(
      `select * from test_jobs where panel_id = $1
       order by created_at desc limit 100`,
      [panelId],
    );
  }
  return sql<TestJob>(
    `select * from test_jobs order by created_at desc limit 200`,
  );
}

export async function runSimulatedTest(options: {
  panelId: string;
  userSub: string;
  command: TestCommand;
  rawInput: string;
}): Promise<{ job: TestJob; reply: string }> {
  const { command } = options;
  if (!command.macAddress) {
    const id = newId("test");
    await sql(
      `insert into test_jobs
        (id, panel_id, status, app_name, mac_address, client_name, duration_hours, raw_input, result_note, created_by_sub)
       values ($1, $2, 'esuat', $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        options.panelId,
        command.appName,
        "",
        command.clientName,
        command.durationHours,
        options.rawInput,
        "Lipsește MAC-ul. Trimite ca în exemplul SMARTONE (Your MAC : AA:BB:...).",
        options.userSub,
      ],
    );
    const rows = await sql<TestJob>("select * from test_jobs where id = $1", [
      id,
    ]);
    return {
      job: rows[0]!,
      reply:
        "Nu am găsit MAC-ul în mesaj.\nExemplu:\n`.efectueaza test SMARTONE 58:96:0A:B3:E2:84 Ion 24h`",
    };
  }

  const id = newId("test");
  await sql(
    `insert into test_jobs
      (id, panel_id, status, app_name, mac_address, client_name, duration_hours, raw_input, result_note, created_by_sub)
     values ($1, $2, 'primit', $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      options.panelId,
      command.appName,
      command.macAddress,
      command.clientName,
      command.durationHours,
      options.rawInput,
      "Job primit în coadă.",
      options.userSub,
    ],
  );

  await sql(
    `update test_jobs set status = 'in_lucru', result_note = $1, updated_at = now() where id = $2`,
    [
      `Creez cont de probă ${command.durationHours}h în panou pentru ${command.appName}…`,
      id,
    ],
  );

  const expiresAt = new Date(
    Date.now() + command.durationHours * 60 * 60 * 1000,
  );
  await addExpiration({
    panelId: options.panelId,
    clientName: command.clientName,
    appName: command.appName,
    macAddress: command.macAddress,
    expiresAt,
    source: "test",
    note: `Test ${command.durationHours}h (simulat v1)`,
  });

  const note = `Test efectuat (simulat v1): ${command.appName} · MAC ${command.macAddress} · ${command.clientName} · ${command.durationHours}h. Termen creat pe panoul de expirări.`;
  await sql(
    `update test_jobs set status = 'efectuat', result_note = $1, updated_at = now() where id = $2`,
    [note, id],
  );

  const rows = await sql<TestJob>("select * from test_jobs where id = $1", [
    id,
  ]);
  const job = rows[0]!;

  const reply = [
    "✅ Test efectuat (simulat — fără panou real încă)",
    `Aplicație: ${command.appName}`,
    `MAC: ${command.macAddress}`,
    `Nume: ${command.clientName}`,
    `Durată: ${command.durationHours}h`,
    `Expiră: ${expiresAt.toLocaleString("ro-RO")}`,
    "",
    "Vezi și panoul Teste / Expirări.",
  ].join("\n");

  return { job, reply };
}
