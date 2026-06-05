const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const root = __dirname;
const dataFile = process.env.DATA_FILE || path.join(root, "data", "store.json");
const sessions = new Map();
const loginAttempts = new Map();

const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
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
};

ensureStore();

function ensureStore() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ users: [] }, null, 2));
  }
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { users: [] };
  }
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

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function passwordMatches(password, user) {
  const candidate = Buffer.from(hashPassword(password, user.passwordSalt).hash, "hex");
  const saved = Buffer.from(user.passwordHash, "hex");
  return candidate.length === saved.length && crypto.timingSafeEqual(candidate, saved);
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

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
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

async function handleApi(request, response, pathname) {
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
    const passwordData = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      profile: { name, specialty: "", phone: "", shop: "" },
      tools: [],
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    writeStore(store);
    createSession(response, user.id, request);
    sendJson(response, 201, { user: publicUser(user) });
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
    sendJson(response, 200, { user: publicUser(user) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    clearSession(response, request);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/api/auth/me") {
    const context = requireUser(request, response);
    if (context) sendJson(response, 200, { user: publicUser(context.user) });
    return;
  }

  const context = requireUser(request, response);
  if (!context) return;

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
