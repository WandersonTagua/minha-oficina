const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const webPush = require("web-push");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const root = __dirname;
const dataFile = process.env.DATA_FILE || path.join(root, "data", "store.json");
const mediaDir = process.env.MEDIA_DIR || path.join(path.dirname(dataFile), "media");
const ownerSetupKey = process.env.OWNER_SETUP_KEY || "";
const devSeedKey = process.env.DEV_SEED_KEY || ownerSetupKey;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:cgerenciador@gmail.com";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const sessions = new Map();
const loginAttempts = new Map();

const staticFiles = new Map([
  ["/", "index.html"],
  ["/tv", "tv.html"],
  ["/tv.html", "tv.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/tv.css", "tv.css"],
  ["/tv.js", "tv.js"],
  ["/manifest.webmanifest", "manifest.webmanifest"],
  ["/service-worker.js", "service-worker.js"],
  ["/icon.svg", "icon.svg"],
  ["/icon-192.png", "icon-192.png"],
  ["/icon-512.png", "icon-512.png"],
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
};

ensureStore();

function ensureStore() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.mkdirSync(mediaDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(createEmptyStore(), null, 2));
  }
}

function createEmptyStore() {
  return {
    users: [],
    organizations: [],
    attendance: [],
    services: [],
    push: {
      subscriptions: [],
      vapid: null,
    },
    tv: {
      mechanic: "",
      queue: [],
      notice: "Colaboradores: verifiquem todas as lâmpadas do veículo para evitar acidentes.",
      highlight: "Promoção do dia: alinhamento por apenas R$44,99",
      audioMuted: true,
      queueSource: "manual",
      playlist: [],
      updatedAt: new Date().toISOString(),
    },
  };
}

function readStore() {
  try {
    const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    store.users ||= [];
    store.organizations ||= [];
    store.attendance ||= [];
    store.services ||= [];
    store.push ||= {};
    store.push.subscriptions ||= [];
    store.tv ||= createEmptyStore().tv;
    store.tv.queue ||= [];
    store.tv.playlist ||= [];
    migrateStore(store);
    return store;
  } catch {
    return createEmptyStore();
  }
}

function migrateStore(store) {
  let changed = false;
  store.push ||= {};
  store.push.subscriptions ||= [];
  if (!vapidPublicKey && !vapidPrivateKey && !store.push.vapid) {
    store.push.vapid = webPush.generateVAPIDKeys();
    changed = true;
  }
  store.users.forEach((user, index) => {
    if (!user.role) {
      user.role = index === 0 ? "owner" : "manager";
      changed = true;
    }
    if (user.role === "manager" && !user.organizationId) {
      const organization = createOrganization(store, user.profile?.shop || user.name || "Oficina");
      user.organizationId = organization.id;
      changed = true;
    }
  });
  (store.organizations || []).forEach((organization) => {
    if (!organization.subscription) {
      organization.subscription = createSubscription("monthly");
      changed = true;
    }
    if (!organization.location) {
      organization.location = { latitude: null, longitude: null, radiusMeters: 150 };
      changed = true;
    }
  });
  if (changed) writeStore(store);
}

function writeStore(store) {
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryFile, dataFile);
}

function getVapidKeys(store) {
  if (vapidPublicKey && vapidPrivateKey) {
    return { publicKey: vapidPublicKey, privateKey: vapidPrivateKey };
  }
  store.push ||= {};
  if (!store.push.vapid) {
    store.push.vapid = webPush.generateVAPIDKeys();
    writeStore(store);
  }
  return store.push.vapid;
}

function configureWebPush(store) {
  const keys = getVapidKeys(store);
  webPush.setVapidDetails(vapidSubject, keys.publicKey, keys.privateKey);
  return keys;
}

function normalizeSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return null;
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) return null;
  return {
    endpoint: String(subscription.endpoint),
    expirationTime: subscription.expirationTime || null,
    keys: {
      p256dh: String(subscription.keys.p256dh),
      auth: String(subscription.keys.auth),
    },
  };
}

async function sendPushToUser(store, userId, payload) {
  configureWebPush(store);
  const subscriptions = store.push?.subscriptions || [];
  const targets = subscriptions.filter((item) => item.userId === userId);
  if (!targets.length) return;
  const message = JSON.stringify(payload);
  const failedEndpoints = new Set();
  await Promise.all(
    targets.map(async (item) => {
      try {
        await webPush.sendNotification(item.subscription, message);
      } catch (error) {
        if ([400, 403, 404, 410].includes(error.statusCode)) failedEndpoints.add(item.subscription.endpoint);
      }
    }),
  );
  if (failedEndpoints.size) {
    store.push.subscriptions = subscriptions.filter((item) => !failedEndpoints.has(item.subscription.endpoint));
    writeStore(store);
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR");
}

function sanitizeText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function slugify(value) {
  const base = sanitizeText(value, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `oficina-${crypto.randomBytes(3).toString("hex")}`;
}

function createOrganization(store, name) {
  return createOrganizationWithPlan(store, name, "monthly");
}

function normalizePlan(plan) {
  return plan === "annual" ? "annual" : "monthly";
}

function addPlanPeriod(fromDate, plan) {
  const date = new Date(fromDate);
  if (normalizePlan(plan) === "annual") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
}

function createSubscription(plan = "monthly") {
  const cleanPlan = normalizePlan(plan);
  const now = new Date();
  return {
    plan: cleanPlan,
    status: "active",
    expiresAt: addPlanPeriod(now, cleanPlan),
    updatedAt: now.toISOString(),
  };
}

function publicOrganizationSubscription(organization) {
  return organization?.subscription || createSubscription("monthly");
}

function createOrganizationWithPlan(store, name, plan = "monthly") {
  const id = crypto.randomUUID();
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let count = 2;
  while ((store.organizations || []).some((item) => item.slug === slug)) {
    slug = `${baseSlug}-${count}`;
    count += 1;
  }
  const organization = {
    id,
    name: sanitizeText(name, 120) || "Oficina",
    slug,
    tv: {
      ...createEmptyStore().tv,
      queueSource: "attendance",
    },
    location: {
      latitude: null,
      longitude: null,
      radiusMeters: 150,
    },
    subscription: createSubscription(plan),
    createdAt: new Date().toISOString(),
  };
  store.organizations ||= [];
  store.organizations.push(organization);
  return organization;
}

function organizationName(store, organizationId) {
  return (store.organizations || []).find((item) => item.id === organizationId)?.name || "";
}

function organizationSlug(store, organizationId) {
  return (store.organizations || []).find((item) => item.id === organizationId)?.slug || "";
}

function findOrganization(store, organizationId) {
  return (store.organizations || []).find((item) => item.id === organizationId) || null;
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distanceInMeters(from, to) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function publicOrganizationLocation(organization) {
  const location = organization?.location || {};
  return {
    latitude: normalizeCoordinate(location.latitude),
    longitude: normalizeCoordinate(location.longitude),
    radiusMeters: Number(location.radiusMeters || 150),
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function passwordMatches(password, user) {
  const candidate = Buffer.from(hashPassword(password, user.passwordSalt).hash, "hex");
  const saved = Buffer.from(user.passwordHash, "hex");
  return candidate.length === saved.length && crypto.timingSafeEqual(candidate, saved);
}

function createUser({ name, email, password, role, organizationId = "", profile = {} }) {
  const passwordData = hashPassword(password);
  return {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    organizationId,
    passwordSalt: passwordData.salt,
    passwordHash: passwordData.hash,
    profile: {
      name,
      specialty: profile.specialty || "",
      phone: profile.phone || "",
      shop: profile.shop || "",
    },
    tools: [],
    createdAt: new Date().toISOString(),
  };
}

function setUserPassword(user, password) {
  const passwordData = hashPassword(password);
  user.passwordSalt = passwordData.salt;
  user.passwordHash = passwordData.hash;
}

function ensureSeedUser(store, data) {
  const email = normalizeEmail(data.email);
  let user = store.users.find((item) => item.email === email);
  if (!user) {
    user = createUser({
      name: data.name,
      email,
      password: data.password,
      role: data.role,
      organizationId: data.organizationId,
      profile: data.profile,
    });
    store.users.push(user);
  } else {
    user.name = data.name;
    user.role = data.role;
    user.organizationId = data.organizationId || "";
    user.profile = {
      ...(user.profile || {}),
      name: data.name,
      specialty: data.profile?.specialty || "",
      phone: data.profile?.phone || "",
      shop: data.profile?.shop || "",
    };
    user.tools ||= [];
    setUserPassword(user, data.password);
  }
  return user;
}

function seedTools(user, tools) {
  user.tools ||= [];
  if (user.tools.length) return;
  user.tools.push(
    ...tools.map((tool) => cleanTool({
      name: tool.name,
      brand: tool.brand,
      model: tool.model,
      category: tool.category,
      date: tool.date,
      price: tool.price,
      serial: tool.serial,
      notes: tool.notes,
      photo: "",
    })),
  );
}

function seedAttendance(store, user, minutesAgo) {
  const existing = (store.attendance || []).find((entry) => entry.userId === user.id && entry.active);
  if (existing) return;
  const checkedInAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  store.attendance.push({
    id: crypto.randomUUID(),
    userId: user.id,
    name: user.name,
    organizationId: user.organizationId,
    checkedInAt,
    active: true,
  });
}

function seedTestData(store, { reset = false } = {}) {
  if (reset) {
    store.users = [];
    store.organizations = [];
    store.attendance = [];
    store.services = [];
    store.push ||= {};
    store.push.subscriptions = [];
  }
  store.users ||= [];
  store.organizations ||= [];
  store.attendance ||= [];
  store.services ||= [];

  let organization = (store.organizations || []).find((item) => item.slug === "oficina-teste");
  if (!organization) {
    organization = createOrganizationWithPlan(store, "Oficina Teste", "monthly");
    organization.slug = "oficina-teste";
  }
  organization.subscription ||= createSubscription("monthly");
  organization.subscription.status = "active";
  organization.tv = {
    ...(organization.tv || createEmptyStore().tv),
    mechanic: "Wanderson",
    queueSource: "attendance",
    notice: "Ambiente de teste: confira as ordens de serviço e a fila.",
    highlight: "Teste de painel TV ativo",
  };

  const password = "12345678";
  const owner = ensureSeedUser(store, {
    name: "Dono Teste",
    email: "dono@minhaoficina.teste",
    password,
    role: "owner",
    profile: { shop: "Minha Oficina Plataforma" },
  });
  const manager = ensureSeedUser(store, {
    name: "Gestor Oficina Teste",
    email: "gestor@minhaoficina.teste",
    password,
    role: "manager",
    organizationId: organization.id,
    profile: { shop: organization.name },
  });
  const mechanics = [
    ensureSeedUser(store, {
      name: "Wanderson Mecânico",
      email: "wanderson@mecanico.teste",
      password,
      role: "employee",
      organizationId: organization.id,
      profile: { specialty: "Diagnóstico", shop: organization.name },
    }),
    ensureSeedUser(store, {
      name: "Henrique Mecânico",
      email: "henrique@mecanico.teste",
      password,
      role: "employee",
      organizationId: organization.id,
      profile: { specialty: "Suspensão", shop: organization.name },
    }),
    ensureSeedUser(store, {
      name: "Leo Mecânico",
      email: "leo@mecanico.teste",
      password,
      role: "employee",
      organizationId: organization.id,
      profile: { specialty: "Elétrica", shop: organization.name },
    }),
  ];

  seedTools(manager, [
    { name: "Scanner automotivo", brand: "Launch", model: "CRP", category: "Diagnóstico", date: "2026-01-10", price: 1800, serial: "TESTE-001", notes: "Ferramenta da oficina." },
    { name: "Carregador de bateria", brand: "JFA", model: "150A", category: "Elétrica", date: "2026-02-15", price: 650, serial: "TESTE-002", notes: "Uso compartilhado." },
  ]);
  seedTools(mechanics[0], [
    { name: "Multímetro", brand: "Minipa", model: "ET-1002", category: "Elétrica", date: "2025-09-12", price: 120, serial: "WAN-001", notes: "Ferramenta do mecânico." },
    { name: "Jogo de soquetes", brand: "Gedore", model: "1/2", category: "Manual", date: "2025-11-20", price: 380, serial: "WAN-002", notes: "Completo." },
  ]);
  seedTools(mechanics[1], [
    { name: "Torquímetro", brand: "Vonder", model: "20-100Nm", category: "Manual", date: "2025-10-05", price: 260, serial: "HEN-001", notes: "Calibrado." },
  ]);

  seedAttendance(store, mechanics[0], 25);
  seedAttendance(store, mechanics[1], 15);
  seedAttendance(store, mechanics[2], 5);

  return {
    ok: true,
    organization: {
      name: organization.name,
      slug: organization.slug,
      plan: organization.subscription.plan,
      status: organization.subscription.status,
    },
    credentials: {
      password,
      owner: owner.email,
      manager: manager.email,
      mechanics: mechanics.map((user) => user.email),
    },
  };
}

function canManageTeam(user) {
  return user.role === "owner" || user.role === "manager";
}

function ensureTeamAccess(user, response) {
  if (!canManageTeam(user)) {
    sendJson(response, 403, { error: "Acesso restrito ao gestor." });
    return false;
  }
  return true;
}

function attendanceQueue(store, organizationId) {
  return (store.attendance || [])
    .filter((entry) => entry.active && (!organizationId || entry.organizationId === organizationId))
    .sort((a, b) => new Date(a.checkedInAt) - new Date(b.checkedInAt));
}

function isUserPresent(store, userId) {
  return (store.attendance || []).some((entry) => entry.userId === userId && entry.active);
}

function busyMechanicIds(store, organizationId) {
  return new Set(
    (store.services || [])
      .filter(
        (service) =>
          service.organizationId === organizationId &&
          ["pending", "running", "paused"].includes(service.status),
      )
      .map((service) => service.mechanicId),
  );
}

function availableAttendanceQueue(store, organizationId) {
  const busy = busyMechanicIds(store, organizationId);
  return attendanceQueue(store, organizationId).filter((entry) => !busy.has(entry.userId));
}

function moveMechanicToEndOfQueue(store, userId) {
  const entry = (store.attendance || []).find((item) => item.userId === userId && item.active);
  if (entry) entry.checkedInAt = new Date().toISOString();
}

function publicAttendance(entry) {
  return {
    userId: entry.userId,
    name: entry.name,
    organizationId: entry.organizationId,
    checkedInAt: entry.checkedInAt,
  };
}

function publicService(service) {
  return {
    id: service.id,
    organizationId: service.organizationId,
    mechanicId: service.mechanicId,
    mechanicName: service.mechanicName,
    managerId: service.managerId,
    managerName: service.managerName,
    title: service.title,
    notes: service.notes,
    mechanicUpdates: service.mechanicUpdates || [],
    status: service.status,
    plate: service.plate || "",
    mileage: service.mileage || "",
    dashboardPhoto: service.dashboardPhoto || "",
    rejectionReason: service.rejectionReason || "",
    createdAt: service.createdAt,
    acceptedAt: service.acceptedAt || "",
    rejectedAt: service.rejectedAt || "",
    finishedAt: service.finishedAt || "",
    pausedAt: service.pausedAt || "",
    pausedFromStatus: service.pausedFromStatus || "",
    approvalPausedAt: service.approvalPausedAt || "",
  };
}

function activeServiceStatuses() {
  return ["pending", "running", "paused", "approval_paused"];
}

function servicesPayload(store, user) {
  const organizationId = user.organizationId;
  const services = (store.services || []).filter((service) => service.organizationId === organizationId);
  if (user.role === "manager") {
    return {
      availableMechanics: availableAttendanceQueue(store, organizationId).map(publicAttendance),
      active: services
        .filter((service) => activeServiceStatuses().includes(service.status))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(publicService),
      all: services
        .filter((service) => service.plate)
        .sort((a, b) => new Date(b.finishedAt || b.rejectedAt || b.acceptedAt || b.createdAt) - new Date(a.finishedAt || a.rejectedAt || a.acceptedAt || a.createdAt))
        .map(publicService),
    };
  }
  if (user.role === "employee") {
    return {
      mine: services
        .filter((service) => service.mechanicId === user.id && activeServiceStatuses().includes(service.status))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(publicService),
      history: services
        .filter((service) => service.mechanicId === user.id && ["finished", "rejected"].includes(service.status))
        .sort((a, b) => new Date(b.finishedAt || b.rejectedAt || b.createdAt) - new Date(a.finishedAt || a.rejectedAt || a.createdAt))
        .map(publicService),
    };
  }
  return { availableMechanics: [], active: [], mine: [], history: [] };
}

function publicTeamUser(user, store) {
  const organization = findOrganization(store, user.organizationId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId || "",
    organizationName: organization?.name || "",
    organizationSlug: organization?.slug || "",
    organizationSubscription: publicOrganizationSubscription(organization),
    createdAt: user.createdAt,
  };
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((item) => item.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

function getSession(request) {
  const token = parseCookies(request).session;
  const session = token ? sessions.get(token) : null;
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return { token, ...session };
}

function createSession(response, userId, request) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  });
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure}`,
  );
}

function clearSession(response, request) {
  const session = getSession(request);
  if (session) sessions.delete(session.token);
  response.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
  );
}

function publicUser(user, store = readStore()) {
  const organization = findOrganization(store, user.organizationId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "manager",
    organizationId: user.organizationId || "",
    organizationName: organization?.name || "",
    organizationSlug: organization?.slug || "",
    organizationSubscription: publicOrganizationSubscription(organization),
    organizationLocation: publicOrganizationLocation(organization),
    profile: user.profile || {},
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        reject(new Error("BODY_TOO_LARGE"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    request.on("error", reject);
  });
}

function readBinaryBody(request, maxBytes = 120_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("BODY_TOO_LARGE"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function requireUser(request, response) {
  const session = getSession(request);
  if (!session) {
    sendJson(response, 401, { error: "Faça login para continuar." });
    return null;
  }
  const store = readStore();
  const user = store.users.find((item) => item.id === session.userId);
  if (!user) {
    sendJson(response, 401, { error: "Sua sessão não é mais válida." });
    return null;
  }
  const organization = findOrganization(store, user.organizationId);
  if (["manager", "employee"].includes(user.role) && organization?.subscription?.status === "blocked") {
    sessions.delete(session.token);
    sendJson(response, 403, { error: "Cadastro da oficina bloqueado. Fale com o gestor do site." });
    return null;
  }
  return { store, user };
}

function isRateLimited(request) {
  const address = request.socket.remoteAddress || "unknown";
  const current = loginAttempts.get(address) || { count: 0, startedAt: Date.now() };
  if (Date.now() - current.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(address, { count: 1, startedAt: Date.now() });
    return false;
  }
  current.count += 1;
  loginAttempts.set(address, current);
  return current.count > 30;
}

function cleanTool(body, existing = {}) {
  return {
    id: existing.id || crypto.randomUUID(),
    name: sanitizeText(body.name, 120),
    brand: sanitizeText(body.brand, 80),
    model: sanitizeText(body.model, 80),
    category: sanitizeText(body.category, 80),
    date: sanitizeText(body.date, 10),
    price: Math.max(0, Number(body.price || 0)),
    serial: sanitizeText(body.serial, 100),
    notes: sanitizeText(body.notes, 1000),
    photo: String(body.photo || "").startsWith("data:image/")
      ? String(body.photo).slice(0, 6_000_000)
      : "",
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function cleanTvSettings(body, existing = {}) {
  const incomingPlaylist = Array.isArray(body.playlist) ? body.playlist : [];
  const playlist = incomingPlaylist
    .map((item) => ({
      id: sanitizeText(item.id, 80) || crypto.randomUUID(),
      type: item.type === "youtube" ? "youtube" : "video",
      title: sanitizeText(item.title, 120),
      url: sanitizeText(item.url, 1000),
    }))
    .filter((item) => item.url);

  return {
    mechanic: sanitizeText(body.mechanic, 100),
    queue: Array.isArray(body.queue)
      ? body.queue.map((name) => sanitizeText(name, 80)).filter(Boolean).slice(0, 20)
      : [],
    notice: sanitizeText(body.notice, 300),
    highlight: sanitizeText(body.highlight, 180),
    audioMuted: body.audioMuted !== false,
    queueSource: ["attendance", "services"].includes(body.queueSource) ? body.queueSource : "attendance",
    playlist,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function extensionForContentType(contentType) {
  if (contentType.includes("video/mp4")) return ".mp4";
  if (contentType.includes("video/webm")) return ".webm";
  if (contentType.includes("video/ogg")) return ".ogv";
  return "";
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/tv") {
    const store = readStore();
    const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const organization = (store.organizations || []).find((item) => item.slug === params.get("org"));
    const tv = { ...(organization?.tv || store.tv || createEmptyStore().tv) };
    if (tv.queueSource === "attendance") {
      const queue = availableAttendanceQueue(store, organization?.id).map(publicAttendance);
      tv.mechanic = queue[0]?.name || tv.mechanic;
      tv.queue = queue.slice(1).map((entry) => entry.name);
    }
    sendJson(response, 200, { tv });
    return;
  }

  if (["GET", "POST"].includes(request.method) && pathname === "/api/dev/seed") {
    const body = request.method === "POST" ? await readJsonBody(request) : {};
    const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const providedKey = String(request.headers["x-seed-key"] || body.key || params.get("key") || "");
    if (!devSeedKey || providedKey !== devSeedKey) {
      sendJson(response, 403, { error: "Chave de teste inválida." });
      return;
    }
    const store = readStore();
    const seeded = seedTestData(store, {
      reset: body.reset === true || params.get("reset") === "1",
    });
    writeStore(store);
    sendJson(response, 200, seeded);
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    if (isRateLimited(request)) {
      sendJson(response, 429, { error: "Muitas tentativas. Aguarde alguns minutos." });
      return;
    }
    const body = await readJsonBody(request);
    const name = sanitizeText(body.name, 100);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (name.length < 2 || !email.includes("@") || password.length < 8) {
      sendJson(response, 400, {
        error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres.",
      });
      return;
    }
    const store = readStore();
    if (store.users.some((user) => user.email === email)) {
      sendJson(response, 409, { error: "Já existe uma conta com este e-mail." });
      return;
    }
    if (store.users.length > 0) {
      sendJson(response, 403, {
        error: "Novas contas devem ser criadas pelo dono ou gestor.",
      });
      return;
    }
    if (ownerSetupKey && String(body.ownerSetupKey || "") !== ownerSetupKey) {
      sendJson(response, 403, {
        error: "Código de criação do dono inválido.",
      });
      return;
    }
    if (!ownerSetupKey) {
      sendJson(response, 403, {
        error: "Configure OWNER_SETUP_KEY no servidor antes de criar o dono.",
      });
      return;
    }
    const user = createUser({
      name,
      email,
      password,
      role: "owner",
      profile: { shop: "Minha plataforma" },
    });
    store.users.push(user);
    writeStore(store);
    createSession(response, user.id, request);
    sendJson(response, 201, { user: publicUser(user, store) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    if (isRateLimited(request)) {
      sendJson(response, 429, { error: "Muitas tentativas. Aguarde alguns minutos." });
      return;
    }
    const body = await readJsonBody(request);
    const store = readStore();
    const user = store.users.find((item) => item.email === normalizeEmail(body.email));
    if (!user || !passwordMatches(String(body.password || ""), user)) {
      sendJson(response, 401, { error: "E-mail ou senha incorretos." });
      return;
    }
    const organization = findOrganization(store, user.organizationId);
    if (["manager", "employee"].includes(user.role) && organization?.subscription?.status === "blocked") {
      sendJson(response, 403, { error: "Cadastro da oficina bloqueado. Fale com o gestor do site." });
      return;
    }
    createSession(response, user.id, request);
    sendJson(response, 200, { user: publicUser(user, store) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    clearSession(response, request);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/api/auth/me") {
    const context = requireUser(request, response);
    if (context) sendJson(response, 200, { user: publicUser(context.user, context.store) });
    return;
  }

  const context = requireUser(request, response);
  if (!context) return;

  if (request.method === "GET" && pathname === "/api/push/public-key") {
    const keys = configureWebPush(context.store);
    sendJson(response, 200, { publicKey: keys.publicKey });
    return;
  }

  if (request.method === "POST" && pathname === "/api/push/subscribe") {
    const body = await readJsonBody(request);
    const subscription = normalizeSubscription(body.subscription || body);
    if (!subscription) {
      sendJson(response, 400, { error: "InscriÃ§Ã£o de notificaÃ§Ã£o invÃ¡lida." });
      return;
    }
    context.store.push ||= {};
    context.store.push.subscriptions ||= [];
    context.store.push.subscriptions = context.store.push.subscriptions.filter(
      (item) => item.subscription.endpoint !== subscription.endpoint,
    );
    context.store.push.subscriptions.push({
      userId: context.user.id,
      organizationId: context.user.organizationId || "",
      role: context.user.role,
      subscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    writeStore(context.store);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && pathname === "/api/push/unsubscribe") {
    const body = await readJsonBody(request);
    const endpoint = String(body.endpoint || "");
    context.store.push ||= {};
    context.store.push.subscriptions ||= [];
    context.store.push.subscriptions = context.store.push.subscriptions.filter(
      (item) => item.subscription.endpoint !== endpoint || item.userId !== context.user.id,
    );
    writeStore(context.store);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/api/team") {
    if (!ensureTeamAccess(context.user, response)) return;
    const users = context.user.role === "owner"
      ? context.store.users.filter((user) => user.role === "manager")
      : context.store.users.filter(
          (user) => user.role === "employee" && user.organizationId === context.user.organizationId,
        );
    sendJson(response, 200, {
      role: context.user.role,
      users: users.map((user) => publicTeamUser(user, context.store)),
      organizations: context.user.role === "owner" ? context.store.organizations : [],
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/team") {
    if (!ensureTeamAccess(context.user, response)) return;
    const body = await readJsonBody(request);
    const name = sanitizeText(body.name, 100);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (name.length < 2 || !email.includes("@") || password.length < 8) {
      sendJson(response, 400, {
        error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres.",
      });
      return;
    }
    if (context.store.users.some((user) => user.email === email)) {
      sendJson(response, 409, { error: "Já existe uma conta com este e-mail." });
      return;
    }

    let role = "employee";
    let organizationId = context.user.organizationId;
    let profile = {};
    if (context.user.role === "owner") {
      role = "manager";
      const organizationName = sanitizeText(body.organizationName, 120) || `${name} Oficina`;
      const organization = createOrganizationWithPlan(context.store, organizationName, body.plan);
      organizationId = organization.id;
      profile = { shop: organization.name };
    }

    const user = createUser({
      name,
      email,
      password,
      role,
      organizationId,
      profile,
    });
    context.store.users.push(user);
    writeStore(context.store);
    sendJson(response, 201, { user: publicTeamUser(user, context.store) });
    return;
  }

  const subscriptionMatch = pathname.match(/^\/api\/organizations\/([^/]+)\/subscription$/);
  if (request.method === "POST" && subscriptionMatch) {
    if (context.user.role !== "owner") {
      sendJson(response, 403, { error: "Apenas o dono do site pode alterar assinaturas." });
      return;
    }
    const organization = findOrganization(context.store, subscriptionMatch[1]);
    if (!organization) {
      sendJson(response, 404, { error: "Oficina não encontrada." });
      return;
    }
    const body = await readJsonBody(request);
    const action = sanitizeText(body.action, 20);
    organization.subscription ||= createSubscription(body.plan || "monthly");
    const now = new Date();
    if (body.plan) organization.subscription.plan = normalizePlan(body.plan);

    if (action === "block") {
      organization.subscription.status = "blocked";
    } else if (action === "renew") {
      organization.subscription.status = "active";
      const baseDate = organization.subscription.expiresAt && new Date(organization.subscription.expiresAt) > now
        ? new Date(organization.subscription.expiresAt)
        : now;
      organization.subscription.expiresAt = addPlanPeriod(baseDate, organization.subscription.plan);
    } else if (action === "activate") {
      organization.subscription.status = "active";
      if (!organization.subscription.expiresAt || new Date(organization.subscription.expiresAt) < now) {
        organization.subscription.expiresAt = addPlanPeriod(now, organization.subscription.plan);
      }
    } else {
      sendJson(response, 400, { error: "Ação de assinatura inválida." });
      return;
    }

    organization.subscription.updatedAt = now.toISOString();
    writeStore(context.store);
    const users = context.store.users
      .filter((user) => user.role === "manager")
      .map((user) => publicTeamUser(user, context.store));
    sendJson(response, 200, { organization, users });
    return;
  }

  if (request.method === "GET" && pathname === "/api/attendance") {
    const organizationId = context.user.role === "owner" ? "" : context.user.organizationId;
    const queue = availableAttendanceQueue(context.store, organizationId).map(publicAttendance);
    const mine = attendanceQueue(context.store, organizationId).map(publicAttendance).find((entry) => entry.userId === context.user.id) || null;
    sendJson(response, 200, { queue, mine });
    return;
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-in") {
    if (!context.user.organizationId) {
      sendJson(response, 400, { error: "Usuário sem oficina vinculada." });
      return;
    }
    const body = await readJsonBody(request);
    const organization = findOrganization(context.store, context.user.organizationId);
    const workshopLocation = publicOrganizationLocation(organization);
    if (workshopLocation.latitude === null || workshopLocation.longitude === null) {
      sendJson(response, 400, { error: "O gestor precisa cadastrar a localização da oficina antes da presença." });
      return;
    }
    const currentLocation = {
      latitude: normalizeCoordinate(body.latitude),
      longitude: normalizeCoordinate(body.longitude),
    };
    if (currentLocation.latitude === null || currentLocation.longitude === null) {
      sendJson(response, 400, { error: "Envie sua localização para marcar presença." });
      return;
    }
    const distance = distanceInMeters(currentLocation, workshopLocation);
    if (distance > workshopLocation.radiusMeters) {
      sendJson(response, 403, {
        error: `Você precisa estar na oficina para marcar presença. Distância aproximada: ${Math.round(distance)}m.`,
      });
      return;
    }
    context.store.attendance ||= [];
    const existing = context.store.attendance.find(
      (entry) => entry.userId === context.user.id && entry.active,
    );
    if (!existing) {
      context.store.attendance.push({
        userId: context.user.id,
        name: context.user.name,
        organizationId: context.user.organizationId,
        checkedInAt: new Date().toISOString(),
        active: true,
      });
    }
    (context.store.services || []).forEach((service) => {
      if (service.mechanicId !== context.user.id || service.status !== "paused") return;
      service.status = service.pausedFromStatus || "running";
      service.resumedAt = new Date().toISOString();
    });
    writeStore(context.store);
    const queue = availableAttendanceQueue(context.store, context.user.organizationId).map(publicAttendance);
    const mine = attendanceQueue(context.store, context.user.organizationId).map(publicAttendance).find((entry) => entry.userId === context.user.id) || null;
    sendJson(response, 200, { queue, mine });
    return;
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-out") {
    let changed = false;
    (context.store.services || []).forEach((service) => {
      if (service.mechanicId !== context.user.id || !["pending", "running"].includes(service.status)) return;
      service.pausedFromStatus = service.status;
      service.status = "paused";
      service.pausedAt = new Date().toISOString();
      changed = true;
    });
    context.store.attendance = (context.store.attendance || []).map((entry) => {
      if (entry.userId !== context.user.id || !entry.active) return entry;
      changed = true;
      return { ...entry, active: false, checkedOutAt: new Date().toISOString() };
    });
    if (changed) writeStore(context.store);
    const queue = availableAttendanceQueue(context.store, context.user.organizationId).map(publicAttendance);
    const mine = attendanceQueue(context.store, context.user.organizationId).map(publicAttendance).find((entry) => entry.userId === context.user.id) || null;
    sendJson(response, 200, { queue, mine });
    return;
  }

  if (request.method === "GET" && pathname === "/api/services") {
    if (!context.user.organizationId) {
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }
    sendJson(response, 200, servicesPayload(context.store, context.user));
    return;
  }

  if (request.method === "POST" && pathname === "/api/services") {
    if (context.user.role !== "manager") {
      sendJson(response, 403, { error: "Apenas o gestor pode despachar serviÃ§os." });
      return;
    }
    const body = await readJsonBody(request);
    const mechanicId = sanitizeText(body.mechanicId, 80);
    const title = sanitizeText(body.title, 140);
    const notes = sanitizeText(body.notes, 500);
    if (!mechanicId || title.length < 3) {
      sendJson(response, 400, { error: "Escolha o mecÃ¢nico e descreva o serviÃ§o." });
      return;
    }
    const available = availableAttendanceQueue(context.store, context.user.organizationId);
    if (!available.some((entry) => entry.userId === mechanicId)) {
      sendJson(response, 409, { error: "Este mecÃ¢nico nÃ£o estÃ¡ disponÃ­vel na fila agora." });
      return;
    }
    const mechanic = context.store.users.find(
      (user) =>
        user.id === mechanicId &&
        user.role === "employee" &&
        user.organizationId === context.user.organizationId,
    );
    if (!mechanic) {
      sendJson(response, 404, { error: "MecÃ¢nico nÃ£o encontrado nesta oficina." });
      return;
    }
    context.store.services ||= [];
    const service = {
      id: crypto.randomUUID(),
      organizationId: context.user.organizationId,
      managerId: context.user.id,
      managerName: context.user.name,
      mechanicId: mechanic.id,
      mechanicName: mechanic.name,
      title,
      notes,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    context.store.services.push(service);
    writeStore(context.store);
    await sendPushToUser(context.store, mechanic.id, {
      title: "Novo serviço recebido",
      body: `${context.user.name} enviou: ${title}`,
      url: "/",
      serviceId: service.id,
    });
    sendJson(response, 201, servicesPayload(context.store, context.user));
    return;
  }

  if (pathname.startsWith("/api/services/")) {
    const [, , , id, action] = pathname.split("/");
    const service = (context.store.services || []).find((item) => item.id === id);
    if (!service || service.organizationId !== context.user.organizationId) {
      sendJson(response, 404, { error: "ServiÃ§o nÃ£o encontrado." });
      return;
    }

    if (request.method === "POST" && action === "accept") {
      if (service.status === "paused") {
        sendJson(response, 409, { error: "Marque presença para retomar este serviço antes de continuar." });
        return;
      }
      if (context.user.id !== service.mechanicId || service.status !== "pending") {
        sendJson(response, 403, { error: "Este serviÃ§o nÃ£o pode ser aceito por este usuÃ¡rio." });
        return;
      }
      const body = await readJsonBody(request);
      const plate = sanitizeText(body.plate, 12).toLocaleUpperCase("pt-BR");
      const mileage = sanitizeText(body.mileage, 20);
      const dashboardPhoto = String(body.dashboardPhoto || "");
      if (!plate || !mileage || !dashboardPhoto.startsWith("data:image/")) {
        sendJson(response, 400, {
          error: "Informe placa, quilometragem e foto do painel em funcionamento.",
        });
        return;
      }
      service.status = "running";
      service.plate = plate;
      service.mileage = mileage;
      service.dashboardPhoto = dashboardPhoto;
      service.mechanicUpdates ||= [];
      service.acceptedAt = new Date().toISOString();
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }

    if (request.method === "POST" && action === "update") {
      if (context.user.id !== service.mechanicId || service.status !== "running") {
        sendJson(response, 403, { error: "Este serviço não pode receber atualização agora." });
        return;
      }
      const body = await readJsonBody(request);
      const observation = sanitizeText(body.observation, 1000);
      const photo = String(body.photo || "");
      if (!observation && !photo.startsWith("data:image/")) {
        sendJson(response, 400, { error: "Adicione uma observação ou uma foto." });
        return;
      }
      service.mechanicUpdates ||= [];
      service.mechanicUpdates.push({
        id: crypto.randomUUID(),
        observation,
        photo: photo.startsWith("data:image/") ? photo.slice(0, 6_000_000) : "",
        createdAt: new Date().toISOString(),
      });
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }

    if (request.method === "POST" && action === "resume") {
      if (context.user.id !== service.mechanicId || !["paused", "approval_paused"].includes(service.status)) {
        sendJson(response, 403, { error: "Este serviço não pode ser retomado agora." });
        return;
      }
      if (!isUserPresent(context.store, context.user.id)) {
        sendJson(response, 409, { error: "Marque presença para retomar este serviço." });
        return;
      }
      service.status = service.pausedFromStatus || "running";
      service.resumedAt = new Date().toISOString();
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }

    if (request.method === "POST" && action === "reject") {
      if (service.status === "paused") {
        sendJson(response, 409, { error: "Marque presença para retomar este serviço antes de rejeitar." });
        return;
      }
      if (context.user.id !== service.mechanicId || service.status !== "pending") {
        sendJson(response, 403, { error: "Este serviÃ§o nÃ£o pode ser rejeitado por este usuÃ¡rio." });
        return;
      }
      const body = await readJsonBody(request);
      const rejectionReason = sanitizeText(body.rejectionReason, 500);
      if (rejectionReason.length < 3) {
        sendJson(response, 400, { error: "Informe o motivo da rejeiÃ§Ã£o do serviÃ§o." });
        return;
      }
      service.status = "rejected";
      service.rejectionReason = rejectionReason;
      service.rejectedAt = new Date().toISOString();
      moveMechanicToEndOfQueue(context.store, context.user.id);
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }

    if (request.method === "POST" && action === "finish") {
      if (service.status === "paused") {
        sendJson(response, 409, { error: "Marque presença para retomar este serviço antes de finalizar." });
        return;
      }
      if (service.status === "approval_paused") {
        sendJson(response, 409, { error: "Este serviço está pausado aguardando aprovação." });
        return;
      }
      if (context.user.id !== service.mechanicId || service.status !== "running") {
        sendJson(response, 403, { error: "Este serviÃ§o nÃ£o pode ser finalizado por este usuÃ¡rio." });
        return;
      }
      service.status = "finished";
      service.finishedAt = new Date().toISOString();
      moveMechanicToEndOfQueue(context.store, context.user.id);
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }

    if (request.method === "POST" && action === "pause-approval") {
      if (context.user.id !== service.mechanicId || service.status !== "running") {
        sendJson(response, 403, { error: "Este serviço não pode ser pausado para aprovação." });
        return;
      }
      service.status = "approval_paused";
      service.approvalPausedAt = new Date().toISOString();
      moveMechanicToEndOfQueue(context.store, context.user.id);
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }
  }

  if (request.method === "PUT" && pathname === "/api/tv") {
    if (!ensureTeamAccess(context.user, response)) return;
    const settings = cleanTvSettings(await readJsonBody(request), context.store.tv);
    if (context.user.role === "manager" && context.user.organizationId) {
      const organization = context.store.organizations.find((item) => item.id === context.user.organizationId);
      if (organization) organization.tv = settings;
    } else {
      context.store.tv = settings;
    }
    writeStore(context.store);
    sendJson(response, 200, { tv: settings });
    return;
  }

  if (request.method === "POST" && pathname === "/api/tv/media") {
    if (!ensureTeamAccess(context.user, response)) return;
    const contentType = String(request.headers["content-type"] || "");
    if (!contentType.startsWith("video/")) {
      sendJson(response, 400, { error: "Envie um arquivo de vídeo válido." });
      return;
    }
    const extension = extensionForContentType(contentType);
    if (!extension) {
      sendJson(response, 400, { error: "Use vídeo MP4, WebM ou OGG." });
      return;
    }
    const title = sanitizeText(new URL(request.url, `http://${request.headers.host}`).searchParams.get("title"), 120);
    const id = crypto.randomUUID();
    const fileName = `${id}${extension}`;
    const filePath = path.join(mediaDir, fileName);
    fs.writeFileSync(filePath, await readBinaryBody(request));
    const media = {
      id,
      type: "video",
      title: title || "Vídeo enviado",
      url: `/media/${fileName}`,
    };
    sendJson(response, 201, { media });
    return;
  }

  if (request.method === "GET" && pathname === "/api/tools") {
    const mechanicTools = context.user.role === "manager"
      ? context.store.users
          .filter((user) => user.role === "employee" && user.organizationId === context.user.organizationId)
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            tools: user.tools || [],
          }))
      : [];
    sendJson(response, 200, { tools: context.user.tools || [], mechanicTools });
    return;
  }

  if (request.method === "POST" && pathname === "/api/tools") {
    const tool = cleanTool(await readJsonBody(request));
    if (!tool.name || !tool.category || !tool.date) {
      sendJson(response, 400, { error: "Preencha nome, categoria e data de aquisição." });
      return;
    }
    context.user.tools ||= [];
    context.user.tools.push(tool);
    writeStore(context.store);
    sendJson(response, 201, { tool });
    return;
  }

  if (pathname.startsWith("/api/tools/")) {
    const id = pathname.split("/").pop();
    const existing = (context.user.tools || []).find((tool) => tool.id === id);
    if (!existing) {
      sendJson(response, 404, { error: "Ferramenta não encontrada." });
      return;
    }
    if (request.method === "PUT") {
      const tool = cleanTool(await readJsonBody(request), existing);
      if (!tool.name || !tool.category || !tool.date) {
        sendJson(response, 400, { error: "Preencha nome, categoria e data de aquisição." });
        return;
      }
      context.user.tools = context.user.tools.map((item) => (item.id === id ? tool : item));
      writeStore(context.store);
      sendJson(response, 200, { tool });
      return;
    }
    if (request.method === "DELETE") {
      context.user.tools = context.user.tools.filter((tool) => tool.id !== id);
      writeStore(context.store);
      sendJson(response, 200, { ok: true });
      return;
    }
  }

  if (request.method === "PUT" && pathname === "/api/profile") {
    const body = await readJsonBody(request);
    context.user.profile = {
      name: sanitizeText(body.name, 100) || context.user.name,
      specialty: sanitizeText(body.specialty, 100),
      phone: sanitizeText(body.phone, 30),
      shop: sanitizeText(body.shop, 120),
    };
    context.user.name = context.user.profile.name;
    if (context.user.role === "manager" && context.user.organizationId) {
      const organization = findOrganization(context.store, context.user.organizationId);
      if (organization) {
        const latitude = normalizeCoordinate(body.workshopLatitude);
        const longitude = normalizeCoordinate(body.workshopLongitude);
        organization.name = context.user.profile.shop || organization.name;
        organization.location ||= { latitude: null, longitude: null, radiusMeters: 150 };
        if (latitude !== null && longitude !== null) {
          organization.location.latitude = latitude;
          organization.location.longitude = longitude;
        }
        organization.location.radiusMeters = 150;
      }
    }
    writeStore(context.store);
    sendJson(response, 200, { user: publicUser(context.user) });
    return;
  }

  sendJson(response, 404, { error: "Rota não encontrada." });
}

function serveStatic(response, pathname) {
  if (pathname.startsWith("/media/")) {
    const fileName = path.basename(pathname);
    const filePath = path.join(mediaDir, fileName);
    fs.readFile(filePath, (error, data) => {
      if (error) {
        sendJson(response, 404, { error: "Mídia não encontrada." });
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(data);
    });
    return;
  }

  const fileName = staticFiles.get(pathname);
  if (!fileName) {
    sendJson(response, 404, { error: "Página não encontrada." });
    return;
  }
  const filePath = path.join(root, fileName);
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, 500, { error: "Não foi possível carregar o app." });
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": pathname === "/service-worker.js" ? "no-cache" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
    });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(request, response, pathname);
    } else if (request.method === "GET") {
      serveStatic(response, pathname);
    } else {
      sendJson(response, 405, { error: "Método não permitido." });
    }
  } catch (error) {
    const status = error.message === "BODY_TOO_LARGE" ? 413 : 400;
    sendJson(response, status, {
      error: status === 413 ? "A imagem ou requisição é muito grande." : "Não foi possível processar a solicitação.",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Minha Oficina disponível em http://${host}:${port}`);
});
