const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const root = __dirname;
const dataFile = process.env.DATA_FILE || path.join(root, "data", "store.json");
const mediaDir = process.env.MEDIA_DIR || path.join(path.dirname(dataFile), "media");
const ownerSetupKey = process.env.OWNER_SETUP_KEY || "";
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
  if (changed) writeStore(store);
}

function writeStore(store) {
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryFile, dataFile);
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

function publicAttendance(entry) {
  return {
    userId: entry.userId,
    name: entry.name,
    organizationId: entry.organizationId,
    checkedInAt: entry.checkedInAt,
  };
}

function publicTeamUser(user, store) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId || "",
    organizationName: organizationName(store, user.organizationId),
    organizationSlug: organizationSlug(store, user.organizationId),
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "manager",
    organizationId: user.organizationId || "",
    organizationName: organizationName(store, user.organizationId),
    organizationSlug: organizationSlug(store, user.organizationId),
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
    queueSource: ["attendance", "services"].includes(body.queueSource) ? body.queueSource : "manual",
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
      const queue = attendanceQueue(store, organization?.id).map(publicAttendance);
      tv.mechanic = queue[0]?.name || tv.mechanic;
      tv.queue = queue.slice(1).map((entry) => entry.name);
    }
    sendJson(response, 200, { tv });
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
      const organization = createOrganization(context.store, organizationName);
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

  if (request.method === "GET" && pathname === "/api/attendance") {
    const organizationId = context.user.role === "owner" ? "" : context.user.organizationId;
    const queue = attendanceQueue(context.store, organizationId).map(publicAttendance);
    const mine = queue.find((entry) => entry.userId === context.user.id) || null;
    sendJson(response, 200, { queue, mine });
    return;
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-in") {
    if (!context.user.organizationId) {
      sendJson(response, 400, { error: "Usuário sem oficina vinculada." });
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
      writeStore(context.store);
    }
    const queue = attendanceQueue(context.store, context.user.organizationId).map(publicAttendance);
    const mine = queue.find((entry) => entry.userId === context.user.id) || null;
    sendJson(response, 200, { queue, mine });
    return;
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-out") {
    let changed = false;
    context.store.attendance = (context.store.attendance || []).map((entry) => {
      if (entry.userId !== context.user.id || !entry.active) return entry;
      changed = true;
      return { ...entry, active: false, checkedOutAt: new Date().toISOString() };
    });
    if (changed) writeStore(context.store);
    const queue = attendanceQueue(context.store, context.user.organizationId).map(publicAttendance);
    const mine = queue.find((entry) => entry.userId === context.user.id) || null;
    sendJson(response, 200, { queue, mine });
    return;
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
    sendJson(response, 200, { tools: context.user.tools || [] });
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
