const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "minha-oficina-test-"));
process.env.DATA_FILE = path.join(testDirectory, "store.json");
process.env.MEDIA_DIR = path.join(testDirectory, "media");
process.env.DEV_SEED_KEY = "test-seed-key";
process.env.DEV_SEED_ENABLED = "true";
process.env.NODE_ENV = "test";

const { server } = require("../server");

function startServer() {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function stopServer() {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(baseUrl, pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.cookie) headers.Cookie = options.cookie;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body, cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
}

async function login(baseUrl, email, password) {
  const result = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.ok(result.cookie.startsWith("session="));
  return result;
}

test("fluxos críticos da oficina", async (context) => {
  const port = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  context.after(async () => {
    await stopServer();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  await context.test("documentos públicos e cabeçalhos de segurança estão disponíveis", async () => {
    const terms = await request(baseUrl, "/termos");
    const privacy = await request(baseUrl, "/privacidade");
    assert.equal(terms.response.status, 200);
    assert.equal(privacy.response.status, 200);
    assert.match(terms.body, /Termos de Uso/);
    assert.match(privacy.body, /Política de Privacidade/);
    assert.equal(terms.response.headers.get("x-frame-options"), "DENY");
    assert.match(terms.response.headers.get("permissions-policy") || "", /geolocation=\(self\)/);
  });

  await context.test("a rota de teste exige a chave correta", async () => {
    const denied = await request(baseUrl, "/api/dev/seed?key=incorreta");
    assert.equal(denied.response.status, 403);

    const seeded = await request(baseUrl, "/api/dev/seed", {
      method: "POST",
      headers: { "x-seed-key": "test-seed-key" },
      body: { reset: true },
    });
    assert.equal(seeded.response.status, 200);
    assert.equal(seeded.body.ok, true);
    assert.equal(seeded.body.credentials.mechanics.length, 3);
  });

  const managerLogin = await login(baseUrl, "gestor@minhaoficina.teste", "12345678");
  let managerCookie = managerLogin.cookie;
  let ownerCookie = "";
  let organizationId = "";
  let mechanicId = "";

  await context.test("dono visualiza clientes e exporta a plataforma completa", async () => {
    const ownerLogin = await login(baseUrl, "dono@minhaoficina.teste", "12345678");
    ownerCookie = ownerLogin.cookie;
    const team = await request(baseUrl, "/api/team", { cookie: ownerLogin.cookie });
    assert.equal(team.response.status, 200);
    const manager = team.body.users.find((user) => user.email === "gestor@minhaoficina.teste");
    assert.ok(manager);
    organizationId = manager.organizationId;

    const backup = await request(baseUrl, "/api/backup/export", { cookie: ownerLogin.cookie });
    assert.equal(backup.response.status, 200);
    assert.equal(backup.body.metadata.scope, "platform");
  });

  await context.test("teste vencido bloqueia acesso e pode ser convertido para plano anual", async () => {
    const store = JSON.parse(fs.readFileSync(process.env.DATA_FILE, "utf8"));
    const organization = store.organizations.find((item) => item.id === organizationId);
    organization.subscription = {
      plan: "trial",
      status: "active",
      expiresAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(process.env.DATA_FILE, JSON.stringify(store, null, 2));

    const openSessionDenied = await request(baseUrl, "/api/auth/me", { cookie: managerCookie });
    assert.equal(openSessionDenied.response.status, 403);
    assert.equal(openSessionDenied.body.code, "expired");

    const denied = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "gestor@minhaoficina.teste", password: "12345678" },
    });
    assert.equal(denied.response.status, 403);
    assert.equal(denied.body.code, "expired");
    assert.match(denied.body.error, /período de teste terminou/i);

    const team = await request(baseUrl, "/api/team", { cookie: ownerCookie });
    const expiredManager = team.body.users.find((user) => user.organizationId === organizationId);
    assert.equal(expiredManager.organizationSubscription.status, "expired");
    assert.ok(expiredManager.organizationSubscription.retentionUntil);

    const earlyDelete = await request(baseUrl, `/api/organizations/${organizationId}`, {
      method: "DELETE",
      cookie: ownerCookie,
      body: { confirmation: organization.name },
    });
    assert.equal(earlyDelete.response.status, 409);

    const activated = await request(baseUrl, `/api/organizations/${organizationId}/subscription`, {
      method: "POST",
      cookie: ownerCookie,
      body: { action: "activate", plan: "annual" },
    });
    assert.equal(activated.response.status, 200);
    const activeManager = activated.body.users.find((user) => user.organizationId === organizationId);
    assert.equal(activeManager.organizationSubscription.status, "active");
    assert.equal(activeManager.organizationSubscription.plan, "annual");
    assert.equal(activeManager.organizationSubscription.retentionUntil, undefined);

    managerCookie = (await login(baseUrl, "gestor@minhaoficina.teste", "12345678")).cookie;
  });

  await context.test("gestor enxerga apenas sua equipe e configura a oficina", async () => {
    const team = await request(baseUrl, "/api/team", { cookie: managerCookie });
    assert.equal(team.response.status, 200);
    assert.equal(team.body.users.length, 3);
    mechanicId = team.body.users.find((user) => user.email === "wanderson@mecanico.teste").id;

    const profile = await request(baseUrl, "/api/profile", {
      method: "PUT",
      cookie: managerCookie,
      body: {
        name: "Gestor Oficina Teste",
        shop: "Oficina Teste",
        specialty: "Gestão",
        phone: "75999999999",
        workshopLatitude: -12.2664,
        workshopLongitude: -38.9663,
      },
    });
    assert.equal(profile.response.status, 200);
    assert.equal(profile.body.user.organizationLocation.radiusMeters, 150);
  });

  const mechanicLogin = await login(baseUrl, "wanderson@mecanico.teste", "12345678");
  const mechanicCookie = mechanicLogin.cookie;

  await context.test("mecânico não acessa gestão e entra na fila pela localização", async () => {
    const forbidden = await request(baseUrl, "/api/team", { cookie: mechanicCookie });
    assert.equal(forbidden.response.status, 403);

    const attendance = await request(baseUrl, "/api/attendance/check-in", {
      method: "POST",
      cookie: mechanicCookie,
      body: { latitude: -12.2664, longitude: -38.9663 },
    });
    assert.equal(attendance.response.status, 200);
    assert.equal(attendance.body.mine.userId, mechanicId);
  });

  let serviceId = "";
  await context.test("gestor despacha e mecânico aceita o serviço", async () => {
    const dispatched = await request(baseUrl, "/api/services", {
      method: "POST",
      cookie: managerCookie,
      body: { mechanicId, title: "Diagnóstico eletrônico", notes: "Verificar luz da injeção" },
    });
    assert.equal(dispatched.response.status, 201, JSON.stringify(dispatched.body));
    serviceId = dispatched.body.active[0].id;

    const accepted = await request(baseUrl, `/api/services/${serviceId}/accept`, {
      method: "POST",
      cookie: mechanicCookie,
      body: {
        plate: "ABC1D23",
        mileage: "125000",
        dashboardPhoto: "data:image/png;base64,AA==",
        vehicle: { brand: "Fiat", model: "Uno", year: "2020", color: "Prata" },
      },
    });
    assert.equal(accepted.response.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.mine[0].status, "running");
    assert.equal(accepted.body.mine[0].acceptance.plate, "ABC1D23");
  });

  await context.test("usuário troca a própria senha", async () => {
    const wrong = await request(baseUrl, "/api/auth/change-password", {
      method: "POST",
      cookie: mechanicCookie,
      body: { currentPassword: "errada", newPassword: "nova-senha-123" },
    });
    assert.equal(wrong.response.status, 401);

    const changed = await request(baseUrl, "/api/auth/change-password", {
      method: "POST",
      cookie: mechanicCookie,
      body: { currentPassword: "12345678", newPassword: "nova-senha-123" },
    });
    assert.equal(changed.response.status, 200);

    const oldLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "wanderson@mecanico.teste", password: "12345678" },
    });
    assert.equal(oldLogin.response.status, 401);
    await login(baseUrl, "wanderson@mecanico.teste", "nova-senha-123");
  });

  await context.test("gestor exporta uma cópia limitada à própria oficina", async () => {
    const backup = await request(baseUrl, "/api/backup/export", { cookie: managerCookie });
    assert.equal(backup.response.status, 200);
    assert.match(backup.response.headers.get("content-disposition") || "", /attachment/);
    assert.equal(backup.body.metadata.scope, "organization");
    assert.equal(backup.body.data.organizations.length, 1);
    assert.ok(backup.body.data.services.some((service) => service.id === serviceId));
  });
});
