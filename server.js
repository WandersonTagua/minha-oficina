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
const ownerSetupKey = String(process.env.OWNER_SETUP_KEY || "").trim();
const devSeedKey = String(process.env.DEV_SEED_KEY || ownerSetupKey).trim();
const devSeedEnabledDefault = process.env.NODE_ENV === "production" ? "false" : "true";
const devSeedEnabled = /^(1|true|yes|on)$/i.test(String(process.env.DEV_SEED_ENABLED || devSeedEnabledDefault).trim());
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:cgerenciador@gmail.com";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vehicleApiProvider = String(process.env.VEHICLE_API_PROVIDER || "").trim().toLocaleLowerCase("pt-BR");
const vehicleApiUrl = process.env.VEHICLE_API_URL || "";
const vehicleApiKey = process.env.VEHICLE_API_KEY || "";
const vehicleApiType = process.env.VEHICLE_API_TYPE || "";
const termsVersion = "2026-09-16";
const subscriptionRetentionDays = 60;
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
  ["/termos", "terms.html"],
  ["/termos.html", "terms.html"],
  ["/privacidade", "privacy.html"],
  ["/privacidade.html", "privacy.html"],
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
    registrationInvites: [],
    attendance: [],
    services: [],
    vehicles: [],
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
    store.registrationInvites ||= [];
    store.attendance ||= [];
    store.services ||= [];
    store.vehicles ||= [];
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
  store.registrationInvites ||= [];
  store.vehicles ||= [];
  if (!vapidPublicKey && !vapidPrivateKey && !store.push.vapid) {
    store.push.vapid = webPush.generateVAPIDKeys();
    changed = true;
  }
  store.users.forEach((user, index) => {
    if (!user.role) {
      user.role = index === 0 ? "owner" : "manager";
      changed = true;
    }
    if (!["owner", "manager", "employee", "reception"].includes(user.role)) {
      user.role = "employee";
      changed = true;
    }
    if (user.active === undefined) {
      user.active = true;
      changed = true;
    }
    if (user.role === "manager" && !user.organizationId) {
      const organization = createOrganization(store, user.profile?.shop || user.name || "Oficina");
      user.organizationId = organization.id;
      changed = true;
    }
  });
  (store.attendance || []).forEach((entry) => {
    if (!entry.id) {
      entry.id = crypto.randomUUID();
      changed = true;
    }
    if (!entry.arrivedAt) {
      entry.arrivedAt = entry.checkedInAt || new Date().toISOString();
      changed = true;
    }
    if (!entry.queuePositionAt) {
      entry.queuePositionAt = entry.checkedInAt || entry.arrivedAt;
      changed = true;
    }
    if (!entry.queueEvents) {
      entry.queueEvents = [{ type: "check-in", at: entry.arrivedAt }];
      changed = true;
    }
  });
  (store.services || []).forEach((service) => {
    if (!service.timeLog) {
      service.timeLog = {};
      changed = true;
    }
    if (service.acceptedAt && !service.timeLog.startedAt) {
      service.timeLog.startedAt = service.acceptedAt;
      changed = true;
    }
    if (service.finishedAt && !service.timeLog.finishedAt) {
      service.timeLog.finishedAt = service.finishedAt;
      changed = true;
    }
    if (!service.acceptance) {
      service.acceptance = {
        plate: service.plate || "",
        mileage: service.mileage || "",
        dashboardPhoto: service.dashboardPhoto || "",
        vehicle: service.vehicle || null,
        acceptedAt: service.acceptedAt || "",
      };
      changed = true;
    }
    if (service.dashboardPhoto && !service.acceptance.dashboardPhoto) {
      service.acceptance.dashboardPhoto = service.dashboardPhoto;
      changed = true;
    }
    if (service.plate && service.vehicle) {
      upsertVehicle(store, service.plate, service.vehicle);
      changed = true;
    }
  });
  (store.organizations || []).forEach((organization) => {
    if (!organization.subscription) {
      organization.subscription = createSubscription("monthly");
      changed = true;
    }
    if (refreshSubscriptionStatus(organization.subscription)) {
      changed = true;
    }
    if (["blocked", "expired"].includes(organization.subscription.status) && !organization.subscription.retentionUntil) {
      const retentionStart = organization.subscription.blockedAt
        || organization.subscription.expiredAt
        || organization.subscription.updatedAt
        || new Date().toISOString();
      organization.subscription.retentionUntil = addRetentionPeriod(retentionStart);
      changed = true;
    }
    if (organization.legalName === undefined) {
      organization.legalName = "";
      organization.cnpj = "";
      organization.phone = "";
      organization.email = "";
      organization.address = "";
      organization.city = "";
      organization.state = "";
      organization.logo = "";
      organization.terms = { accepted: false, acceptedAt: "", version: "" };
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

function backupForUser(store, user) {
  const generatedAt = new Date().toISOString();
  if (user.role === "owner") {
    return {
      metadata: { generatedAt, scope: "platform", version: 1 },
      data: store,
    };
  }

  const organizationId = user.organizationId;
  const organization = findOrganization(store, organizationId);
  const services = (store.services || []).filter((service) => service.organizationId === organizationId);
  const plates = new Set(services.map((service) => normalizePlate(service.plate)).filter(Boolean));
  return {
    metadata: {
      generatedAt,
      scope: "organization",
      organizationId,
      organizationName: organization?.name || "Oficina",
      version: 1,
    },
    data: {
      users: (store.users || []).filter((item) => item.organizationId === organizationId),
      organizations: organization ? [organization] : [],
      registrationInvites: [],
      attendance: (store.attendance || []).filter((entry) => entry.organizationId === organizationId),
      services,
      vehicles: (store.vehicles || []).filter((vehicle) => plates.has(normalizePlate(vehicle.plate))),
      push: {
        subscriptions: (store.push?.subscriptions || []).filter((item) => item.organizationId === organizationId),
      },
      tv: organization?.tv || store.tv || createEmptyStore().tv,
    },
  };
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

function onlyDigits(value, maxLength = 30) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function normalizePlate(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toLocaleUpperCase("pt-BR").slice(0, 12);
}

function cleanVehicleData(body = {}) {
  return {
    plate: normalizePlate(body.plate),
    brand: sanitizeText(body.brand || body.marca, 80),
    model: sanitizeText(body.model || body.modelo, 100),
    year: sanitizeText(body.year || body.ano, 20),
    color: sanitizeText(body.color || body.cor, 50),
    source: sanitizeText(body.source, 40) || "manual",
    updatedAt: new Date().toISOString(),
  };
}

function findVehicle(store, plate) {
  const cleanPlate = normalizePlate(plate);
  return (store.vehicles || []).find((vehicle) => vehicle.plate === cleanPlate) || null;
}

function upsertVehicle(store, plate, data = {}) {
  const vehicle = cleanVehicleData({ ...data, plate });
  if (!vehicle.plate) return null;
  store.vehicles ||= [];
  const existing = findVehicle(store, vehicle.plate);
  if (existing) {
    ["brand", "model", "year", "color"].forEach((field) => {
      if (vehicle[field]) existing[field] = vehicle[field];
    });
    existing.source = vehicle.source || existing.source || "manual";
    existing.updatedAt = vehicle.updatedAt;
    return existing;
  }
  vehicle.id = crypto.randomUUID();
  store.vehicles.push(vehicle);
  return vehicle;
}

function firstFilledValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function vehicleResponseCandidates(data) {
  if (!data || typeof data !== "object") return [];
  const candidates = [data];
  ["data", "dados", "response", "result", "resultado", "vehicle", "veiculo", "VEICULO"].forEach((field) => {
    const value = data[field];
    if (value && typeof value === "object") {
      candidates.push(value);
      if (Array.isArray(value)) candidates.push(...value.filter((item) => item && typeof item === "object"));
    }
  });
  return candidates;
}

function vehicleFromApiResponse(data, plate, source = "api") {
  const candidates = vehicleResponseCandidates(data);
  const read = (...keys) => {
    for (const item of candidates) {
      const value = firstFilledValue(...keys.map((key) => item[key]));
      if (value) return value;
    }
    return "";
  };
  const vehicle = cleanVehicleData({
    plate,
    brand: read("brand", "marca", "MARCA", "marca_veiculo", "Marca"),
    model: read("model", "modelo", "MODELO", "modelo_veiculo", "Modelo", "versao", "VERSAO"),
    year: read("year", "ano", "ANO", "anoModelo", "ano_modelo", "ano_fabricacao", "anoFabricacao"),
    color: read("color", "cor", "COR", "cor_veiculo", "Cor"),
    source,
  });
  return vehicle.brand || vehicle.model || vehicle.year || vehicle.color ? vehicle : null;
}

function vehicleAuthorizationHeader() {
  if (!vehicleApiKey) return {};
  const value = vehicleApiKey.trim();
  return {
    Authorization: /^bearer\s+/i.test(value) ? value : `Bearer ${value}`,
    "x-api-key": value,
  };
}

async function lookupVehicleFromApi(plate) {
  if (!vehicleApiUrl) return null;
  const provider = vehicleApiProvider || (vehicleApiUrl.includes("apibrasil") ? "apibrasil" : "generic");
  const url = vehicleApiUrl.replace("{plate}", encodeURIComponent(plate));
  const headers = vehicleAuthorizationHeader();
  const options = { headers, signal: null };
  if (provider === "apibrasil") {
    const body = { placa: plate, homolog: false };
    if (vehicleApiType) body.tipo = vehicleApiType;
    options.method = "POST";
    options.headers = { "Content-Type": "application/json" };
    if (headers.Authorization) options.headers.Authorization = headers.Authorization;
    options.body = JSON.stringify(body);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    options.signal = controller.signal;
    const response = await fetch(url, options);
    if (!response.ok) return null;
    const data = await response.json();
    return vehicleFromApiResponse(data, plate, provider === "apibrasil" ? "apibrasil" : "api");
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeImageDataUrl(value) {
  const text = String(value || "");
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(text)) return "";
  return text.length <= 1_500_000 ? text : "";
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
  if (plan === "trial") return "trial";
  return plan === "annual" ? "annual" : "monthly";
}

function addPlanPeriod(fromDate, plan) {
  const date = new Date(fromDate);
  const cleanPlan = normalizePlan(plan);
  if (cleanPlan === "trial") {
    date.setDate(date.getDate() + 7);
  } else if (cleanPlan === "annual") {
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

function createTrialSubscription() {
  const now = new Date();
  return {
    plan: "trial",
    status: "active",
    expiresAt: addPlanPeriod(now, "trial"),
    updatedAt: now.toISOString(),
  };
}

function addRetentionPeriod(fromDate) {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + subscriptionRetentionDays);
  return date.toISOString();
}

function refreshSubscriptionStatus(subscription, now = new Date()) {
  if (!subscription || subscription.status !== "active" || !subscription.expiresAt) return false;
  const expiresAt = new Date(subscription.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt > now) return false;
  subscription.status = "expired";
  subscription.expiredAt = expiresAt.toISOString();
  subscription.retentionUntil ||= addRetentionPeriod(now);
  subscription.updatedAt = now.toISOString();
  return true;
}

function publicOrganizationSubscription(organization) {
  const subscription = organization?.subscription || createSubscription("monthly");
  const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const remainingMilliseconds = expiresAt && !Number.isNaN(expiresAt.getTime())
    ? expiresAt.getTime() - Date.now()
    : null;
  const daysRemaining = remainingMilliseconds === null ? null : Math.max(0, Math.ceil(remainingMilliseconds / 86400000));
  return {
    ...subscription,
    daysRemaining,
    expiringSoon: subscription.status === "active" && daysRemaining !== null && daysRemaining <= 3,
    retentionDays: subscriptionRetentionDays,
    canDelete: ["blocked", "expired"].includes(subscription.status) && Boolean(
      subscription.retentionUntil && new Date(subscription.retentionUntil) <= new Date(),
    ),
  };
}

function createOrganizationWithPlan(store, name, plan = "monthly", details = {}) {
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
    legalName: sanitizeText(details.legalName, 160),
    cnpj: onlyDigits(details.cnpj, 14),
    phone: sanitizeText(details.phone, 30),
    email: normalizeEmail(details.email),
    address: sanitizeText(details.address, 220),
    city: sanitizeText(details.city, 80),
    state: sanitizeText(details.state, 2).toLocaleUpperCase("pt-BR"),
    logo: sanitizeImageDataUrl(details.logo),
    terms: {
      accepted: Boolean(details.termsAccepted),
      acceptedAt: details.termsAccepted ? new Date().toISOString() : "",
      version: details.termsAccepted ? termsVersion : "",
    },
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
    subscription: plan === "trial" ? createTrialSubscription() : createSubscription(plan),
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
  return createUserWithPasswordData({ name, email, passwordData, role, organizationId, profile });
}

function createUserWithPasswordData({ name, email, passwordData, role, organizationId = "", profile = {} }) {
  return {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    organizationId,
    active: true,
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

function isOperationalRole(role) {
  return ["manager", "reception"].includes(role);
}

function normalizeTeamRole(value, fallback = "employee") {
  const role = sanitizeText(value, 20);
  return ["employee", "manager", "reception"].includes(role) ? role : fallback;
}

function roleLabel(role) {
  const labels = {
    owner: "Dono do site",
    manager: "Gestor",
    reception: "Recepção",
    employee: "Mecânico",
  };
  return labels[role] || role;
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
    user.active = data.active !== undefined ? Boolean(data.active) : true;
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
    arrivedAt: checkedInAt,
    queuePositionAt: checkedInAt,
    queueEvents: [{ type: "check-in", at: checkedInAt }],
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

function canOperateYard(user) {
  return isOperationalRole(user.role);
}

function ensureTeamAccess(user, response) {
  if (!canManageTeam(user)) {
    sendJson(response, 403, { error: "Acesso restrito ao gestor." });
    return false;
  }
  return true;
}

function attendanceQueue(store, organizationId) {
  const activeUsers = new Set((store.users || []).filter((user) => user.active !== false).map((user) => user.id));
  return (store.attendance || [])
    .filter((entry) => entry.active && activeUsers.has(entry.userId) && (!organizationId || entry.organizationId === organizationId))
    .sort((a, b) => new Date(a.queuePositionAt || a.checkedInAt) - new Date(b.queuePositionAt || b.checkedInAt));
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
  if (entry) {
    const now = new Date().toISOString();
    entry.queuePositionAt = now;
    entry.lastReturnedAt = now;
    entry.queueEvents ||= [];
    entry.queueEvents.push({ type: "return-to-queue", at: now });
  }
}

function publicAttendance(entry) {
  return {
    userId: entry.userId,
    name: entry.name,
    organizationId: entry.organizationId,
    checkedInAt: entry.arrivedAt || entry.checkedInAt,
    arrivedAt: entry.arrivedAt || entry.checkedInAt,
    queuePositionAt: entry.queuePositionAt || entry.checkedInAt,
    lastReturnedAt: entry.lastReturnedAt || "",
  };
}

function publicService(service) {
  const acceptance = service.acceptance || {};
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
    dashboardPhoto: acceptance.dashboardPhoto || service.dashboardPhoto || "",
    acceptance: {
      plate: acceptance.plate || service.plate || "",
      mileage: acceptance.mileage || service.mileage || "",
      dashboardPhoto: acceptance.dashboardPhoto || service.dashboardPhoto || "",
      acceptedAt: acceptance.acceptedAt || service.acceptedAt || "",
      vehicle: acceptance.vehicle || service.vehicle || null,
    },
    vehicle: acceptance.vehicle || service.vehicle || null,
    timeLog: service.timeLog || {},
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
  if (canOperateYard(user)) {
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
    roleLabel: roleLabel(user.role),
    active: user.active !== false,
    organizationId: user.organizationId || "",
    organizationName: organization?.name || "",
    organizationLegalName: organization?.legalName || "",
    organizationCnpj: organization?.cnpj || "",
    organizationPhone: organization?.phone || "",
    organizationEmail: organization?.email || "",
    organizationAddress: organization?.address || "",
    organizationCity: organization?.city || "",
    organizationState: organization?.state || "",
    organizationLogo: organization?.logo || "",
    organizationTerms: organization?.terms || { accepted: false, acceptedAt: "", version: "" },
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

function invalidateUserSessions(userId, exceptToken = "") {
  for (const [token, session] of sessions.entries()) {
    if (session.userId === userId && token !== exceptToken) sessions.delete(token);
  }
}

function invalidateOrganizationSessions(store, organizationId) {
  const userIds = new Set(
    (store.users || []).filter((user) => user.organizationId === organizationId).map((user) => user.id),
  );
  for (const [token, session] of sessions.entries()) {
    if (userIds.has(session.userId)) sessions.delete(token);
  }
}

function subscriptionAccessError(organization) {
  const status = organization?.subscription?.status;
  if (!status || status === "active") return "";
  if (status === "expired") {
    return organization.subscription.plan === "trial"
      ? "Seu período de teste terminou. Fale com o responsável pela plataforma para escolher um plano."
      : "A assinatura da oficina venceu. Fale com o responsável pela plataforma para renovar o acesso.";
  }
  return "Cadastro da oficina bloqueado. Fale com o responsável pela plataforma.";
}

function publicUser(user, store = readStore()) {
  const organization = findOrganization(store, user.organizationId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "manager",
    roleLabel: roleLabel(user.role || "manager"),
    active: user.active !== false,
    organizationId: user.organizationId || "",
    organizationName: organization?.name || "",
    organizationLegalName: organization?.legalName || "",
    organizationLogo: organization?.logo || "",
    organizationSlug: organization?.slug || "",
    organizationSubscription: publicOrganizationSubscription(organization),
    organizationLocation: publicOrganizationLocation(organization),
    profile: user.profile || {},
  };
}

function publicRegistrationInvite(invite) {
  const submission = invite.submission || {};
  return {
    id: invite.id,
    token: invite.token,
    status: invite.status,
    createdAt: invite.createdAt,
    submittedAt: invite.submittedAt || "",
    approvedAt: invite.approvedAt || "",
    rejectedAt: invite.rejectedAt || "",
    submission: {
      managerName: submission.managerName || "",
      managerEmail: submission.managerEmail || "",
      organizationName: submission.organizationName || "",
      organizationLegalName: submission.organizationLegalName || "",
      organizationCnpj: submission.organizationCnpj || "",
      organizationPhone: submission.organizationPhone || "",
      organizationEmail: submission.organizationEmail || "",
      organizationAddress: submission.organizationAddress || "",
      organizationCity: submission.organizationCity || "",
      organizationState: submission.organizationState || "",
      organizationLogo: submission.organizationLogo || "",
    },
  };
}

function cleanRegistrationSubmission(body) {
  return {
    managerName: sanitizeText(body.managerName, 100),
    managerEmail: normalizeEmail(body.managerEmail),
    passwordData: hashPassword(String(body.managerPassword || "")),
    passwordLength: String(body.managerPassword || "").length,
    organizationName: sanitizeText(body.organizationName, 120),
    organizationLegalName: sanitizeText(body.organizationLegalName, 160),
    organizationCnpj: onlyDigits(body.organizationCnpj, 14),
    organizationPhone: sanitizeText(body.organizationPhone, 30),
    organizationEmail: normalizeEmail(body.organizationEmail),
    organizationAddress: sanitizeText(body.organizationAddress, 220),
    organizationCity: sanitizeText(body.organizationCity, 80),
    organizationState: sanitizeText(body.organizationState, 2).toLocaleUpperCase("pt-BR"),
    organizationLogo: sanitizeImageDataUrl(body.organizationLogo),
    organizationTermsAccepted: Boolean(body.organizationTermsAccepted),
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function sendJsonDownload(response, fileName, body) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
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
  if (user.active === false) {
    sessions.delete(session.token);
    sendJson(response, 403, { error: "Seu acesso está desativado. Fale com o responsável pela oficina." });
    return null;
  }
  const organization = findOrganization(store, user.organizationId);
  const accessError = ["manager", "employee", "reception"].includes(user.role)
    ? subscriptionAccessError(organization)
    : "";
  if (accessError) {
    sessions.delete(session.token);
    sendJson(response, 403, { error: accessError, code: organization.subscription.status });
    return null;
  }
  return { store, user, session };
}

function loginAddress(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function isRateLimited(request) {
  const current = loginAttempts.get(loginAddress(request));
  if (!current) return false;
  if (Date.now() - current.startedAt > 15 * 60 * 1000) {
    loginAttempts.delete(loginAddress(request));
    return false;
  }
  return current.count >= 10;
}

function recordFailedLogin(request) {
  const address = loginAddress(request);
  const current = loginAttempts.get(address);
  if (!current || Date.now() - current.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(address, { count: 1, startedAt: Date.now() });
    return;
  }
  current.count += 1;
}

function clearLoginAttempts(request) {
  loginAttempts.delete(loginAddress(request));
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
    if (!devSeedEnabled) {
      sendJson(response, 404, { error: "Ambiente de teste desativado." });
      return;
    }
    const body = request.method === "POST" ? await readJsonBody(request) : {};
    const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const providedKey = String(request.headers["x-seed-key"] || body.key || params.get("key") || "").trim();
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
    sendJson(response, 403, {
      error: "Cadastro público desativado. Acesse com uma conta liberada pelo gestor.",
    });
    return;
  }

  const inviteSubmitMatch = pathname.match(/^\/api\/registration-invites\/([^/]+)\/submit$/);
  if (request.method === "POST" && inviteSubmitMatch) {
    const store = readStore();
    const token = sanitizeText(decodeURIComponent(inviteSubmitMatch[1]), 120);
    const invite = (store.registrationInvites || []).find((item) => item.token === token);
    if (!invite || invite.status !== "open") {
      sendJson(response, 404, { error: "Link inválido, expirado ou já utilizado." });
      return;
    }
    const submission = cleanRegistrationSubmission(await readJsonBody(request));
    if (submission.managerName.length < 2 || !submission.managerEmail.includes("@") || submission.passwordLength < 8) {
      sendJson(response, 400, { error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres." });
      return;
    }
    if (!submission.organizationName || !submission.organizationLegalName) {
      sendJson(response, 400, { error: "Informe nome fantasia e razão social da oficina." });
      return;
    }
    if (submission.organizationCnpj.length !== 14) {
      sendJson(response, 400, { error: "Informe o CNPJ da oficina com 14 dígitos." });
      return;
    }
    if (!submission.organizationPhone && !submission.organizationEmail) {
      sendJson(response, 400, { error: "Informe telefone ou e-mail comercial da oficina." });
      return;
    }
    if (!submission.organizationAddress || !submission.organizationCity || submission.organizationState.length !== 2) {
      sendJson(response, 400, { error: "Informe endereço, cidade e UF da oficina." });
      return;
    }
    if (!submission.organizationTermsAccepted) {
      sendJson(response, 400, { error: "Aceite os termos de uso para enviar o cadastro." });
      return;
    }
    if (store.users.some((user) => user.email === submission.managerEmail)) {
      sendJson(response, 409, { error: "Já existe uma conta com este e-mail." });
      return;
    }
    if ((store.organizations || []).some((organization) => organization.cnpj === submission.organizationCnpj)) {
      sendJson(response, 409, { error: "Já existe uma oficina cadastrada com este CNPJ." });
      return;
    }
    invite.status = "submitted";
    invite.submission = submission;
    invite.submittedAt = new Date().toISOString();
    writeStore(store);
    sendJson(response, 200, { ok: true });
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
      recordFailedLogin(request);
      sendJson(response, 401, { error: "E-mail ou senha incorretos." });
      return;
    }
    if (user.active === false) {
      sendJson(response, 403, { error: "Seu acesso está desativado. Fale com o responsável pela oficina." });
      return;
    }
    const organization = findOrganization(store, user.organizationId);
    const accessError = ["manager", "employee", "reception"].includes(user.role)
      ? subscriptionAccessError(organization)
      : "";
    if (accessError) {
      sendJson(response, 403, { error: accessError, code: organization.subscription.status });
      return;
    }
    clearLoginAttempts(request);
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

  if (request.method === "POST" && pathname === "/api/auth/change-password") {
    const body = await readJsonBody(request);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!passwordMatches(currentPassword, context.user)) {
      sendJson(response, 401, { error: "A senha atual está incorreta." });
      return;
    }
    if (newPassword.length < 8) {
      sendJson(response, 400, { error: "A nova senha precisa ter pelo menos 8 caracteres." });
      return;
    }
    if (newPassword === currentPassword) {
      sendJson(response, 400, { error: "Escolha uma senha diferente da senha atual." });
      return;
    }
    setUserPassword(context.user, newPassword);
    writeStore(context.store);
    invalidateUserSessions(context.user.id, context.session.token);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/api/backup/export") {
    if (!["owner", "manager"].includes(context.user.role)) {
      sendJson(response, 403, { error: "Apenas o dono do site ou o gestor pode exportar dados." });
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    const scope = context.user.role === "owner" ? "plataforma" : organizationSlug(context.store, context.user.organizationId) || "oficina";
    sendJsonDownload(response, `minha-oficina-backup-${scope}-${date}.json`, backupForUser(context.store, context.user));
    return;
  }

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
          (user) => ["employee", "reception"].includes(user.role) && user.organizationId === context.user.organizationId,
        );
    sendJson(response, 200, {
      role: context.user.role,
      users: users.map((user) => publicTeamUser(user, context.store)),
      organizations: context.user.role === "owner" ? context.store.organizations : [],
      invites: context.user.role === "owner"
        ? (context.store.registrationInvites || []).map(publicRegistrationInvite)
        : [],
    });
    return;
  }

  const teamMemberMatch = pathname.match(/^\/api\/team\/([^/]+)$/);
  if (teamMemberMatch && request.method === "PUT") {
    if (!ensureTeamAccess(context.user, response)) return;
    const target = context.store.users.find((user) => user.id === teamMemberMatch[1]);
    if (!target) {
      sendJson(response, 404, { error: "Usuário não encontrado." });
      return;
    }
    const isOwnerEditingManager = context.user.role === "owner" && target.role === "manager";
    const isManagerEditingOwnTeam = context.user.role === "manager" &&
      target.organizationId === context.user.organizationId &&
      ["employee", "reception"].includes(target.role);
    if (!isOwnerEditingManager && !isManagerEditingOwnTeam) {
      sendJson(response, 403, { error: "Você não tem permissão para editar este cadastro." });
      return;
    }
    const body = await readJsonBody(request);
    const name = sanitizeText(body.name, 100);
    const email = normalizeEmail(body.email);
    if (name.length < 2 || !email.includes("@")) {
      sendJson(response, 400, { error: "Informe nome e e-mail válido." });
      return;
    }
    const emailInUse = context.store.users.some((user) => user.id !== target.id && user.email === email);
    if (emailInUse) {
      sendJson(response, 409, { error: "Já existe uma conta com este e-mail." });
      return;
    }
    target.name = name;
    target.email = email;
    target.active = body.active !== false;
    target.profile ||= {};
    target.profile.name = name;
    target.profile.phone = sanitizeText(body.phone ?? target.profile.phone, 30);
    target.profile.specialty = sanitizeText(body.specialty ?? target.profile.specialty, 100);
    const password = String(body.password || "");
    if (password) {
      if (password.length < 8) {
        sendJson(response, 400, { error: "A nova senha precisa ter pelo menos 8 caracteres." });
        return;
      }
      setUserPassword(target, password);
    }
    if (isManagerEditingOwnTeam) {
      target.role = normalizeTeamRole(body.role, target.role);
      if (target.role === "manager") target.role = "reception";
    }
    if (isOwnerEditingManager) {
      const organization = findOrganization(context.store, target.organizationId);
      if (organization) {
        organization.name = sanitizeText(body.organizationName, 120) || organization.name;
        organization.legalName = sanitizeText(body.organizationLegalName, 160) || organization.legalName;
        organization.phone = sanitizeText(body.organizationPhone, 30);
        organization.email = normalizeEmail(body.organizationEmail);
        organization.address = sanitizeText(body.organizationAddress, 220) || organization.address;
        organization.city = sanitizeText(body.organizationCity, 80) || organization.city;
        organization.state = sanitizeText(body.organizationState, 2).toLocaleUpperCase("pt-BR") || organization.state;
        target.profile.shop = organization.name;
      }
    }
    writeStore(context.store);
    const users = context.user.role === "owner"
      ? context.store.users.filter((user) => user.role === "manager")
      : context.store.users.filter((user) => ["employee", "reception"].includes(user.role) && user.organizationId === context.user.organizationId);
    sendJson(response, 200, { user: publicTeamUser(target, context.store), users: users.map((user) => publicTeamUser(user, context.store)) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/registration-invites") {
    if (context.user.role !== "owner") {
      sendJson(response, 403, { error: "Apenas o dono do site pode gerar links de cadastro." });
      return;
    }
    const invite = {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(18).toString("base64url"),
      status: "open",
      createdBy: context.user.id,
      createdAt: new Date().toISOString(),
      submission: null,
    };
    context.store.registrationInvites ||= [];
    context.store.registrationInvites.push(invite);
    writeStore(context.store);
    const isLocalHost = /^localhost(:|$)|^127\.0\.0\.1(:|$)/.test(String(request.headers.host || ""));
    const protocol = request.headers["x-forwarded-proto"] || (isLocalHost ? "http" : "https");
    const hostName = request.headers["x-forwarded-host"] || request.headers.host;
    sendJson(response, 201, {
      invite: publicRegistrationInvite(invite),
      link: `${protocol}://${hostName}/cadastro/${invite.token}`,
    });
    return;
  }

  const inviteApproveMatch = pathname.match(/^\/api\/registration-invites\/([^/]+)\/approve$/);
  if (request.method === "POST" && inviteApproveMatch) {
    if (context.user.role !== "owner") {
      sendJson(response, 403, { error: "Apenas o dono do site pode aprovar cadastros." });
      return;
    }
    const invite = (context.store.registrationInvites || []).find((item) => item.id === inviteApproveMatch[1]);
    if (!invite || invite.status !== "submitted" || !invite.submission) {
      sendJson(response, 404, { error: "Cadastro pendente não encontrado." });
      return;
    }
    const body = await readJsonBody(request);
    const action = sanitizeText(body.action, 20);
    if (action === "reject") {
      invite.status = "rejected";
      invite.rejectedAt = new Date().toISOString();
      writeStore(context.store);
      const users = context.store.users.filter((user) => user.role === "manager").map((user) => publicTeamUser(user, context.store));
      sendJson(response, 200, { users, invites: context.store.registrationInvites.map(publicRegistrationInvite) });
      return;
    }
    const plan = action === "trial" ? "trial" : action === "annual" ? "annual" : "monthly";
    const submission = invite.submission;
    if (context.store.users.some((user) => user.email === submission.managerEmail)) {
      sendJson(response, 409, { error: "Já existe uma conta com este e-mail." });
      return;
    }
    if ((context.store.organizations || []).some((organization) => organization.cnpj === submission.organizationCnpj)) {
      sendJson(response, 409, { error: "Já existe uma oficina cadastrada com este CNPJ." });
      return;
    }
    const organization = createOrganizationWithPlan(context.store, submission.organizationName, plan, {
      legalName: submission.organizationLegalName,
      cnpj: submission.organizationCnpj,
      phone: submission.organizationPhone,
      email: submission.organizationEmail,
      address: submission.organizationAddress,
      city: submission.organizationCity,
      state: submission.organizationState,
      logo: submission.organizationLogo,
      termsAccepted: true,
    });
    const user = createUserWithPasswordData({
      name: submission.managerName,
      email: submission.managerEmail,
      passwordData: submission.passwordData,
      role: "manager",
      organizationId: organization.id,
      profile: { shop: organization.name },
    });
    context.store.users.push(user);
    invite.status = "approved";
    invite.approvedAt = new Date().toISOString();
    invite.organizationId = organization.id;
    invite.managerId = user.id;
    writeStore(context.store);
    const users = context.store.users.filter((item) => item.role === "manager").map((item) => publicTeamUser(item, context.store));
    sendJson(response, 200, { users, invites: context.store.registrationInvites.map(publicRegistrationInvite) });
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
      const legalName = sanitizeText(body.organizationLegalName, 160);
      const phone = sanitizeText(body.organizationPhone, 30);
      const commercialEmail = normalizeEmail(body.organizationEmail);
      const address = sanitizeText(body.organizationAddress, 220);
      const city = sanitizeText(body.organizationCity, 80);
      const state = sanitizeText(body.organizationState, 2).toLocaleUpperCase("pt-BR");
      if (!organizationName || !legalName) {
        sendJson(response, 400, { error: "Informe nome fantasia e razão social da oficina." });
        return;
      }
      const organizationCnpj = onlyDigits(body.organizationCnpj, 14);
      if (organizationCnpj.length !== 14) {
        sendJson(response, 400, { error: "Informe o CNPJ da oficina com 14 dígitos." });
        return;
      }
      if (!phone && !commercialEmail) {
        sendJson(response, 400, { error: "Informe telefone ou e-mail comercial da oficina." });
        return;
      }
      if (!address || !city || state.length !== 2) {
        sendJson(response, 400, { error: "Informe endereço, cidade e UF da oficina." });
        return;
      }
      if ((context.store.organizations || []).some((organization) => organization.cnpj === organizationCnpj)) {
        sendJson(response, 409, { error: "Já existe uma oficina cadastrada com este CNPJ." });
        return;
      }
      if (!body.organizationTermsAccepted) {
        sendJson(response, 400, { error: "Aceite os termos de uso para cadastrar a oficina." });
        return;
      }
      const organization = createOrganizationWithPlan(context.store, organizationName, body.plan, {
        legalName,
        cnpj: organizationCnpj,
        phone,
        email: commercialEmail,
        address,
        city,
        state,
        logo: body.organizationLogo,
        termsAccepted: true,
      });
      organizationId = organization.id;
      profile = { shop: organization.name };
    } else {
      role = normalizeTeamRole(body.role, "employee");
      if (role === "manager") role = "reception";
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
    const requestedPlan = ["monthly", "annual"].includes(body.plan) ? body.plan : "";
    if (body.plan && !requestedPlan) {
      sendJson(response, 400, { error: "Escolha o plano mensal ou anual." });
      return;
    }
    const currentPlan = organization.subscription.plan;
    const nextPlan = requestedPlan || (currentPlan === "trial" ? "monthly" : normalizePlan(currentPlan));
    const planChanged = nextPlan !== currentPlan;

    if (action === "block") {
      organization.subscription.status = "blocked";
      organization.subscription.blockedAt = now.toISOString();
      organization.subscription.retentionUntil = addRetentionPeriod(now);
      invalidateOrganizationSessions(context.store, organization.id);
    } else if (action === "renew") {
      organization.subscription.plan = nextPlan;
      organization.subscription.status = "active";
      const baseDate = !planChanged && organization.subscription.expiresAt && new Date(organization.subscription.expiresAt) > now
        ? new Date(organization.subscription.expiresAt)
        : now;
      organization.subscription.expiresAt = addPlanPeriod(baseDate, organization.subscription.plan);
    } else if (action === "activate") {
      organization.subscription.plan = nextPlan;
      organization.subscription.status = "active";
      if (planChanged || !organization.subscription.expiresAt || new Date(organization.subscription.expiresAt) < now) {
        organization.subscription.expiresAt = addPlanPeriod(now, organization.subscription.plan);
      }
    } else {
      sendJson(response, 400, { error: "Ação de assinatura inválida." });
      return;
    }

    if (["activate", "renew"].includes(action)) {
      delete organization.subscription.expiredAt;
      delete organization.subscription.blockedAt;
      delete organization.subscription.retentionUntil;
    }
    organization.subscription.updatedAt = now.toISOString();
    writeStore(context.store);
    const users = context.store.users
      .filter((user) => user.role === "manager")
      .map((user) => publicTeamUser(user, context.store));
    sendJson(response, 200, { organization, users });
    return;
  }

  const organizationDeleteMatch = pathname.match(/^\/api\/organizations\/([^/]+)$/);
  if (request.method === "DELETE" && organizationDeleteMatch) {
    if (context.user.role !== "owner") {
      sendJson(response, 403, { error: "Apenas o dono do site pode excluir uma oficina." });
      return;
    }
    const organization = findOrganization(context.store, organizationDeleteMatch[1]);
    if (!organization) {
      sendJson(response, 404, { error: "Oficina não encontrada." });
      return;
    }
    const subscription = publicOrganizationSubscription(organization);
    if (!subscription.canDelete) {
      sendJson(response, 409, {
        error: `Os dados ficam protegidos por ${subscriptionRetentionDays} dias após o bloqueio ou vencimento.`,
      });
      return;
    }
    const body = await readJsonBody(request);
    if (sanitizeText(body.confirmation, 120) !== organization.name) {
      sendJson(response, 400, { error: "Digite exatamente o nome da oficina para confirmar a exclusão." });
      return;
    }

    const organizationId = organization.id;
    const removedServices = (context.store.services || []).filter((service) => service.organizationId === organizationId);
    const removedPlates = new Set(removedServices.map((service) => normalizePlate(service.plate)).filter(Boolean));
    const remainingServices = (context.store.services || []).filter((service) => service.organizationId !== organizationId);
    const retainedPlates = new Set(remainingServices.map((service) => normalizePlate(service.plate)).filter(Boolean));
    const removedUserIds = new Set(
      (context.store.users || []).filter((user) => user.organizationId === organizationId).map((user) => user.id),
    );
    const removedMediaUrls = new Set(
      (organization.tv?.playlist || [])
        .filter((item) => item.type === "video" && String(item.url || "").startsWith("/media/"))
        .map((item) => item.url),
    );

    invalidateOrganizationSessions(context.store, organizationId);
    context.store.organizations = context.store.organizations.filter((item) => item.id !== organizationId);
    context.store.users = context.store.users.filter((user) => user.organizationId !== organizationId);
    context.store.attendance = (context.store.attendance || []).filter((entry) => entry.organizationId !== organizationId);
    context.store.services = remainingServices;
    context.store.vehicles = (context.store.vehicles || []).filter((vehicle) => {
      const plate = normalizePlate(vehicle.plate);
      return !removedPlates.has(plate) || retainedPlates.has(plate);
    });
    context.store.registrationInvites = (context.store.registrationInvites || []).filter(
      (invite) => invite.organizationId !== organizationId,
    );
    context.store.push.subscriptions = (context.store.push?.subscriptions || []).filter(
      (item) => item.organizationId !== organizationId && !removedUserIds.has(item.userId),
    );
    writeStore(context.store);
    const retainedMediaUrls = new Set([
      ...(context.store.tv?.playlist || []).map((item) => item.url),
      ...context.store.organizations.flatMap((item) => (item.tv?.playlist || []).map((media) => media.url)),
    ]);
    removedMediaUrls.forEach((url) => {
      if (retainedMediaUrls.has(url)) return;
      try {
        fs.unlinkSync(path.join(mediaDir, path.basename(url)));
      } catch {
        // O arquivo pode já ter sido removido; a exclusão dos demais dados continua.
      }
    });
    const users = context.store.users
      .filter((user) => user.role === "manager")
      .map((user) => publicTeamUser(user, context.store));
    sendJson(response, 200, { ok: true, users });
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
    if (context.user.role !== "employee") {
      sendJson(response, 403, { error: "Apenas mecânicos podem marcar presença na fila." });
      return;
    }
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
      const now = new Date().toISOString();
      context.store.attendance.push({
        id: crypto.randomUUID(),
        userId: context.user.id,
        name: context.user.name,
        organizationId: context.user.organizationId,
        checkedInAt: now,
        arrivedAt: now,
        queuePositionAt: now,
        queueEvents: [{ type: "check-in", at: now }],
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
    if (context.user.role !== "employee") {
      sendJson(response, 403, { error: "Apenas mecânicos podem encerrar presença na fila." });
      return;
    }
    let changed = false;
    (context.store.services || []).forEach((service) => {
      if (service.mechanicId !== context.user.id || !["pending", "running"].includes(service.status)) return;
      service.pausedFromStatus = service.status;
      service.status = "paused";
      service.pausedAt = new Date().toISOString();
      service.timeLog ||= {};
      service.timeLog.pausedAt = service.pausedAt;
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

  if (request.method === "GET" && pathname === "/api/vehicles/lookup") {
    const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const plate = normalizePlate(params.get("plate"));
    if (!plate) {
      sendJson(response, 400, { error: "Informe a placa para consulta." });
      return;
    }
    const existing = findVehicle(context.store, plate);
    if (existing) {
      sendJson(response, 200, { found: true, source: "local", vehicle: existing });
      return;
    }
    const apiVehicle = await lookupVehicleFromApi(plate);
    if (apiVehicle) {
      const vehicle = upsertVehicle(context.store, plate, apiVehicle);
      writeStore(context.store);
      sendJson(response, 200, { found: true, source: vehicle.source || "api", vehicle });
      return;
    }
    sendJson(response, 200, { found: false, source: vehicleApiUrl ? "api" : "none", vehicle: { plate } });
    return;
  }

  if (request.method === "POST" && pathname === "/api/services") {
    if (!canOperateYard(context.user)) {
      sendJson(response, 403, { error: "Apenas gestor ou recepção podem despachar serviços." });
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
        user.active !== false &&
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
      timeLog: {},
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
      const vehicle = cleanVehicleData({
        ...(body.vehicle || {}),
        plate,
        source: body.vehicle?.source || "manual",
      });
      const savedVehicle = upsertVehicle(context.store, plate, vehicle) || { plate };
      const acceptedAt = new Date().toISOString();
      service.status = "running";
      service.plate = plate;
      service.mileage = mileage;
      service.dashboardPhoto = dashboardPhoto.slice(0, 6_000_000);
      service.vehicle = savedVehicle;
      service.acceptance = {
        plate,
        mileage,
        dashboardPhoto: service.dashboardPhoto,
        vehicle: savedVehicle,
        acceptedAt,
      };
      service.mechanicUpdates ||= [];
      service.acceptedAt = acceptedAt;
      service.timeLog ||= {};
      service.timeLog.startedAt = acceptedAt;
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
      service.timeLog ||= {};
      service.timeLog.lastResumedAt = service.resumedAt;
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
      service.timeLog ||= {};
      service.timeLog.rejectedAt = service.rejectedAt;
      moveMechanicToEndOfQueue(context.store, context.user.id);
      service.timeLog.returnedToQueueAt = new Date().toISOString();
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
      service.timeLog ||= {};
      service.timeLog.finishedAt = service.finishedAt;
      service.timeLog.returnedToQueueAt = new Date().toISOString();
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
      service.timeLog ||= {};
      service.timeLog.approvalPausedAt = service.approvalPausedAt;
      service.timeLog.returnedToQueueAt = new Date().toISOString();
      writeStore(context.store);
      sendJson(response, 200, servicesPayload(context.store, context.user));
      return;
    }
  }

  if (request.method === "PUT" && pathname === "/api/tv") {
    if (!canOperateYard(context.user) && context.user.role !== "owner") {
      sendJson(response, 403, { error: "Acesso restrito ao gestor ou recepção." });
      return;
    }
    const settings = cleanTvSettings(await readJsonBody(request), context.store.tv);
    if (canOperateYard(context.user) && context.user.organizationId) {
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
    if (!canOperateYard(context.user) && context.user.role !== "owner") {
      sendJson(response, 403, { error: "Acesso restrito ao gestor ou recepção." });
      return;
    }
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
    const mechanicTools = canOperateYard(context.user)
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
    if (isOperationalRole(context.user.role) && context.user.organizationId) {
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
  if (pathname.startsWith("/cadastro/")) {
    pathname = "/index.html";
  }
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
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'",
  );
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

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`Minha Oficina disponível em http://${host}:${port}`);
  });
}

module.exports = {
  server,
  createEmptyStore,
  hashPassword,
  passwordMatches,
};
