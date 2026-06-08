const state = {
  user: null,
  tools: [],
  profile: {
    name: "",
    specialty: "",
    phone: "",
    shop: "",
  },
  tv: {
    mechanic: "",
    queue: [],
    notice: "",
    highlight: "",
    audioMuted: true,
    queueSource: "manual",
    playlist: [],
  },
  team: [],
  attendance: {
    queue: [],
    mine: null,
  },
  currentPhoto: "",
  installPrompt: null,
};

const elements = {
  loginTab: document.querySelector("#loginTab"),
  registerTab: document.querySelector("#registerTab"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  registerName: document.querySelector("#registerName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  ownerSetupKey: document.querySelector("#ownerSetupKey"),
  loginError: document.querySelector("#loginError"),
  registerError: document.querySelector("#registerError"),
  installButton: document.querySelector("#installButton"),
  logoutButton: document.querySelector("#logoutButton"),
  accountName: document.querySelector("#accountName"),
  accountEmail: document.querySelector("#accountEmail"),
  accountAvatar: document.querySelector("#accountAvatar"),
  sidebar: document.querySelector(".sidebar"),
  pageTitle: document.querySelector("#pageTitle"),
  inventorySection: document.querySelector("#inventorySection"),
  profileSection: document.querySelector("#profileSection"),
  tvSection: document.querySelector("#tvSection"),
  teamSection: document.querySelector("#teamSection"),
  attendanceSection: document.querySelector("#attendanceSection"),
  welcomeName: document.querySelector("#welcomeName"),
  totalTools: document.querySelector("#totalTools"),
  totalValue: document.querySelector("#totalValue"),
  recentTools: document.querySelector("#recentTools"),
  toolsGrid: document.querySelector("#toolsGrid"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  toolModal: document.querySelector("#toolModal"),
  toolForm: document.querySelector("#toolForm"),
  toolModalTitle: document.querySelector("#toolModalTitle"),
  toolId: document.querySelector("#toolId"),
  toolName: document.querySelector("#toolName"),
  toolBrand: document.querySelector("#toolBrand"),
  toolModel: document.querySelector("#toolModel"),
  toolCategory: document.querySelector("#toolCategory"),
  toolDate: document.querySelector("#toolDate"),
  toolPrice: document.querySelector("#toolPrice"),
  toolSerial: document.querySelector("#toolSerial"),
  toolNotes: document.querySelector("#toolNotes"),
  toolPhoto: document.querySelector("#toolPhoto"),
  photoPicker: document.querySelector(".photo-picker"),
  photoImage: document.querySelector("#photoImage"),
  profileForm: document.querySelector("#profileForm"),
  profileName: document.querySelector("#profileName"),
  profileSpecialty: document.querySelector("#profileSpecialty"),
  profilePhone: document.querySelector("#profilePhone"),
  profileShop: document.querySelector("#profileShop"),
  profileSavedMessage: document.querySelector("#profileSavedMessage"),
  tvForm: document.querySelector("#tvForm"),
  tvMechanic: document.querySelector("#tvMechanic"),
  tvQueue: document.querySelector("#tvQueue"),
  tvNotice: document.querySelector("#tvNotice"),
  tvHighlight: document.querySelector("#tvHighlight"),
  tvAudioMuted: document.querySelector("#tvAudioMuted"),
  tvQueueSource: document.querySelector("#tvQueueSource"),
  tvSavedMessage: document.querySelector("#tvSavedMessage"),
  openTvButton: document.querySelector("#openTvButton"),
  youtubeUrl: document.querySelector("#youtubeUrl"),
  addYoutubeButton: document.querySelector("#addYoutubeButton"),
  localVideo: document.querySelector("#localVideo"),
  uploadVideoButton: document.querySelector("#uploadVideoButton"),
  playlistList: document.querySelector("#playlistList"),
  teamForm: document.querySelector("#teamForm"),
  teamName: document.querySelector("#teamName"),
  teamEmail: document.querySelector("#teamEmail"),
  teamPassword: document.querySelector("#teamPassword"),
  organizationField: document.querySelector("#organizationField"),
  organizationName: document.querySelector("#organizationName"),
  teamTitle: document.querySelector("#teamTitle"),
  teamSubtitle: document.querySelector("#teamSubtitle"),
  teamFormTitle: document.querySelector("#teamFormTitle"),
  teamFormHelp: document.querySelector("#teamFormHelp"),
  teamSubmitButton: document.querySelector("#teamSubmitButton"),
  teamSavedMessage: document.querySelector("#teamSavedMessage"),
  teamListTitle: document.querySelector("#teamListTitle"),
  teamList: document.querySelector("#teamList"),
  managerAttendanceList: document.querySelector("#managerAttendanceList"),
  attendanceStatusText: document.querySelector("#attendanceStatusText"),
  checkInButton: document.querySelector("#checkInButton"),
  checkOutButton: document.querySelector("#checkOutButton"),
  employeeAttendanceList: document.querySelector("#employeeAttendanceList"),
  reportDate: document.querySelector("#reportDate"),
  reportFooterDate: document.querySelector("#reportFooterDate"),
  reportOwner: document.querySelector("#reportOwner"),
  reportSummary: document.querySelector("#reportSummary"),
  reportTools: document.querySelector("#reportTools"),
  toast: document.querySelector("#toast"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Não foi possível concluir a solicitação.");
  return body;
}

function showAuth(tab = "login") {
  state.user = null;
  state.tools = [];
  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  switchAuthTab(tab);
}

function showAuthenticated(user) {
  state.user = user;
  state.profile = user.profile || {
    name: user.name,
    specialty: "",
    phone: "",
    shop: "",
  };
  elements.accountName.textContent = user.name;
  elements.accountEmail.textContent = user.email;
  elements.accountAvatar.textContent = user.name?.charAt(0).toLocaleUpperCase("pt-BR") || "M";
  document.body.classList.remove("auth-pending");
  document.body.classList.add("authenticated");
}

function switchAuthTab(tab) {
  const loginActive = tab === "login";
  elements.loginTab.classList.toggle("active", loginActive);
  elements.registerTab.classList.toggle("active", !loginActive);
  elements.loginForm.classList.toggle("active", loginActive);
  elements.registerForm.classList.toggle("active", !loginActive);
  elements.loginError.textContent = "";
  elements.registerError.textContent = "";
}

async function loadApp() {
  try {
    const { user } = await api("/api/auth/me");
    showAuthenticated(user);
    await refreshRoleData();
    renderProfile();
    renderAll();
  } catch {
    showAuth();
  }
}

async function refreshRoleData() {
  setupRoleUi();
  if (state.user.role === "employee") {
    const [{ tools }, attendance] = await Promise.all([
      api("/api/tools"),
      api("/api/attendance"),
    ]);
    state.tools = tools;
    state.attendance = attendance;
    renderAttendance();
    showSection("inventory");
    return;
  }

  const tvPath = state.user.organizationSlug
    ? `/api/tv?org=${encodeURIComponent(state.user.organizationSlug)}`
    : "/api/tv";
  const [{ tools }, { tv }, team, attendance] = await Promise.all([
    api("/api/tools"),
    api(tvPath),
    api("/api/team"),
    api("/api/attendance"),
  ]);
  state.tools = tools;
  state.tv = tv;
  state.team = team.users || [];
  state.attendance = attendance;
  renderTvPanel();
  renderTeam();
  renderAttendance();
  if (state.user.role === "owner") showSection("team");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function formatToday() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date());
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

function renderStats() {
  const totalValue = state.tools.reduce((sum, tool) => sum + Number(tool.price || 0), 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = state.tools.filter((tool) => new Date(tool.createdAt) >= thirtyDaysAgo).length;

  elements.totalTools.textContent = state.tools.length;
  elements.totalValue.textContent = formatCurrency(totalValue);
  elements.recentTools.textContent = recent;
  elements.welcomeName.textContent = state.profile.name?.split(" ")[0] || "mecânico";
}

function updateCategoryFilter() {
  const selected = elements.categoryFilter.value;
  const categories = [...new Set(state.tools.map((tool) => tool.category).filter(Boolean))].sort();

  elements.categoryFilter.replaceChildren();
  elements.categoryFilter.append(new Option("Todas as categorias", ""));
  categories.forEach((category) => elements.categoryFilter.append(new Option(category, category)));
  elements.categoryFilter.value = categories.includes(selected) ? selected : "";
}

function createToolCard(tool) {
  const card = createElement("article", "tool-card");
  const photo = createElement("div", "tool-card-photo");

  if (tool.photo) {
    const image = document.createElement("img");
    image.src = tool.photo;
    image.alt = tool.name;
    photo.append(image);
  } else {
    photo.append(createElement("span", "", "🔧"));
  }

  const body = createElement("div", "tool-card-body");
  const top = createElement("div", "tool-card-top");
  const titleBlock = document.createElement("div");
  titleBlock.append(createElement("span", "category-chip", tool.category));
  titleBlock.append(createElement("h3", "", tool.name));

  const actions = createElement("div", "card-actions");
  const editButton = createElement("button", "card-action", "Editar");
  editButton.type = "button";
  editButton.addEventListener("click", () => openToolModal(tool));
  const deleteButton = createElement("button", "card-action danger", "Excluir");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => deleteTool(tool.id));
  actions.append(editButton, deleteButton);
  top.append(titleBlock, actions);

  const brandModel = [tool.brand, tool.model].filter(Boolean).join(" · ") || "Marca e modelo não informados";
  const subtitle = createElement("p", "tool-card-subtitle", brandModel);
  const meta = createElement("div", "tool-card-meta");

  const dateMeta = document.createElement("div");
  dateMeta.append(createElement("span", "", "Aquisição"));
  dateMeta.append(createElement("strong", "", formatDate(tool.date)));

  const priceMeta = document.createElement("div");
  priceMeta.append(createElement("span", "", "Valor"));
  priceMeta.append(createElement("strong", "", tool.price ? formatCurrency(tool.price) : "Não informado"));

  meta.append(dateMeta, priceMeta);
  body.append(top, subtitle, meta);
  card.append(photo, body);
  return card;
}

function renderTools() {
  const search = elements.searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const category = elements.categoryFilter.value;
  const visibleTools = state.tools
    .filter((tool) => {
      const searchable = [tool.name, tool.brand, tool.model, tool.category, tool.serial]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return (!search || searchable.includes(search)) && (!category || tool.category === category);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  elements.toolsGrid.replaceChildren(...visibleTools.map(createToolCard));
  elements.emptyState.classList.toggle("visible", visibleTools.length === 0);

  const emptyTitle = elements.emptyState.querySelector("h3");
  const emptyText = elements.emptyState.querySelector("p");
  const isFiltered = Boolean(search || category);
  emptyTitle.textContent = isFiltered ? "Nenhuma ferramenta encontrada" : "Sua bancada digital começa aqui";
  emptyText.textContent = isFiltered
    ? "Tente buscar por outro nome ou remova os filtros."
    : "Cadastre sua primeira ferramenta para começar a montar o inventário.";
}

function renderAll() {
  renderStats();
  updateCategoryFilter();
  renderTools();
}

function renderTvPanel() {
  elements.tvMechanic.value = state.tv.mechanic || "";
  elements.tvQueue.value = (state.tv.queue || []).join("\n");
  elements.tvNotice.value = state.tv.notice || "";
  elements.tvHighlight.value = state.tv.highlight || "";
  elements.tvAudioMuted.checked = state.tv.audioMuted !== false;
  elements.tvQueueSource.value = state.tv.queueSource || "manual";
  renderPlaylist();
}

function renderPlaylist() {
  const items = state.tv.playlist || [];
  if (!items.length) {
    elements.playlistList.replaceChildren(createElement("p", "tool-card-subtitle", "Nenhum vídeo adicionado ao painel."));
    return;
  }

  elements.playlistList.replaceChildren(
    ...items.map((item) => {
      const row = createElement("div", "playlist-item");
      row.append(createElement("span", "playlist-type", item.type === "youtube" ? "YouTube" : "Vídeo"));
      const info = document.createElement("div");
      info.append(createElement("strong", "", item.title || "Mídia sem título"));
      info.append(createElement("small", "", item.url));
      const remove = createElement("button", "playlist-remove", "Remover");
      remove.type = "button";
      remove.addEventListener("click", () => {
        state.tv.playlist = state.tv.playlist.filter((media) => media.id !== item.id);
        renderPlaylist();
      });
      row.append(info, remove);
      return row;
    }),
  );
}

function setupRoleUi() {
  const role = state.user?.role || "employee";
  document.querySelectorAll("[data-section]").forEach((button) => {
    const section = button.dataset.section;
    const managerSections = ["inventory", "profile", "tv", "team"];
    const employeeSections = ["inventory", "attendance"];
    const ownerSections = ["team", "profile"];
    const visible =
      (role === "owner" && ownerSections.includes(section)) ||
      (role === "manager" && managerSections.includes(section)) ||
      (role === "employee" && employeeSections.includes(section));
    button.hidden = !visible;
  });

  elements.organizationField.hidden = role !== "owner";
  elements.teamTitle.textContent = role === "owner" ? "Gestores/clientes" : "Colaboradores e fila";
  elements.teamSubtitle.textContent =
    role === "owner"
      ? "Cadastre os gestores das oficinas que usarão o sistema."
      : "Cadastre colaboradores e acompanhe a ordem de chegada.";
  elements.teamFormTitle.textContent = role === "owner" ? "Cadastrar gestor" : "Cadastrar colaborador";
  elements.teamFormHelp.textContent =
    role === "owner"
      ? "Este gestor poderá cadastrar os próprios colaboradores."
      : "O colaborador usará o celular para marcar presença.";
  elements.teamListTitle.textContent = role === "owner" ? "Gestores cadastrados" : "Colaboradores cadastrados";
  elements.teamSubmitButton.textContent = role === "owner" ? "Cadastrar gestor" : "Cadastrar colaborador";
  document.querySelector("#addToolButton").hidden = role !== "manager";
  document.querySelector("#reportButton").hidden = role !== "manager";
  document.querySelector("#sidebarReportButton").hidden = role !== "manager";
  document.querySelector(".sidebar-card").hidden = role !== "manager";
}

function renderTeam() {
  if (!elements.teamList) return;
  if (!state.team.length) {
    elements.teamList.replaceChildren(createElement("p", "tool-card-subtitle", "Nenhum usuário cadastrado ainda."));
    return;
  }
  elements.teamList.replaceChildren(
    ...state.team.map((user) => {
      const row = createElement("div", "team-row");
      const avatar = createElement("span", "account-avatar", user.name.charAt(0).toLocaleUpperCase("pt-BR"));
      const info = document.createElement("div");
      info.append(createElement("strong", "", user.name));
      info.append(createElement("small", "", `${user.email}${user.organizationName ? ` · ${user.organizationName}` : ""}`));
      const role = createElement("span", "playlist-type", user.role === "manager" ? "Gestor" : "Colaborador");
      row.append(avatar, info, role);
      return row;
    }),
  );
}

function renderAttendanceList(container) {
  const queue = state.attendance.queue || [];
  if (!queue.length) {
    container.replaceChildren(createElement("p", "tool-card-subtitle", "Ninguém marcou presença ainda."));
    return;
  }
  container.replaceChildren(
    ...queue.map((entry, index) => {
      const row = createElement("div", "attendance-row");
      row.append(createElement("span", "attendance-position", String(index + 1)));
      const info = document.createElement("div");
      info.append(createElement("strong", "", entry.name));
      info.append(createElement("small", "", `Chegou às ${new Date(entry.checkedInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`));
      row.append(info);
      return row;
    }),
  );
}

function renderAttendance() {
  renderAttendanceList(elements.managerAttendanceList);
  renderAttendanceList(elements.employeeAttendanceList);
  const mine = state.attendance.mine;
  elements.attendanceStatusText.textContent = mine
    ? "Você está presente e já entrou na fila da oficina."
    : "Marque presença para entrar automaticamente na fila.";
  elements.checkInButton.textContent = mine ? "Encerrar expediente" : "Marcar presença";
  elements.checkInButton.classList.toggle("button-primary", !mine);
  elements.checkInButton.classList.toggle("button-secondary", Boolean(mine));
  elements.checkInButton.hidden = false;
  elements.checkOutButton.hidden = true;
}

function openToolModal(tool = null) {
  elements.toolForm.reset();
  elements.toolId.value = tool?.id || "";
  elements.toolModalTitle.textContent = tool ? "Editar ferramenta" : "Nova ferramenta";
  elements.toolName.value = tool?.name || "";
  elements.toolBrand.value = tool?.brand || "";
  elements.toolModel.value = tool?.model || "";
  elements.toolCategory.value = tool?.category || "";
  elements.toolDate.value = tool?.date || new Date().toISOString().slice(0, 10);
  elements.toolPrice.value = tool?.price || "";
  elements.toolSerial.value = tool?.serial || "";
  elements.toolNotes.value = tool?.notes || "";
  state.currentPhoto = tool?.photo || "";
  updatePhotoPreview();
  elements.toolModal.classList.add("open");
  elements.toolModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => elements.toolName.focus(), 50);
}

function closeToolModal() {
  elements.toolModal.classList.remove("open");
  elements.toolModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updatePhotoPreview() {
  elements.photoImage.src = state.currentPhoto;
  elements.photoPicker.classList.toggle("has-photo", Boolean(state.currentPhoto));
}

async function compressImage(file) {
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  const maxDimension = 1000;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function submitTool(event) {
  event.preventDefault();
  const id = elements.toolId.value;
  const existing = state.tools.find((tool) => tool.id === id);
  const tool = {
    name: elements.toolName.value.trim(),
    brand: elements.toolBrand.value.trim(),
    model: elements.toolModel.value.trim(),
    category: elements.toolCategory.value.trim(),
    date: elements.toolDate.value,
    price: elements.toolPrice.value,
    serial: elements.toolSerial.value.trim(),
    notes: elements.toolNotes.value.trim(),
    photo: state.currentPhoto,
  };

  try {
    const result = await api(existing ? `/api/tools/${id}` : "/api/tools", {
      method: existing ? "PUT" : "POST",
      body: JSON.stringify(tool),
    });
    if (existing) {
      state.tools = state.tools.map((item) => (item.id === id ? result.tool : item));
    } else {
      state.tools.push(result.tool);
    }
    renderAll();
    closeToolModal();
    showToast(existing ? "Ferramenta atualizada." : "Ferramenta cadastrada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteTool(id) {
  const tool = state.tools.find((item) => item.id === id);
  if (!tool || !window.confirm(`Excluir "${tool.name}" do inventário?`)) return;
  try {
    await api(`/api/tools/${id}`, { method: "DELETE" });
    state.tools = state.tools.filter((item) => item.id !== id);
    renderAll();
    showToast("Ferramenta excluída.");
  } catch (error) {
    showToast(error.message);
  }
}

function renderProfile() {
  elements.profileName.value = state.profile.name || "";
  elements.profileSpecialty.value = state.profile.specialty || "";
  elements.profilePhone.value = state.profile.phone || "";
  elements.profileShop.value = state.profile.shop || "";
}

async function submitProfile(event) {
  event.preventDefault();
  const profile = {
    name: elements.profileName.value.trim(),
    specialty: elements.profileSpecialty.value.trim(),
    phone: elements.profilePhone.value.trim(),
    shop: elements.profileShop.value.trim(),
  };
  try {
    const { user } = await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    state.profile = user.profile;
    showAuthenticated(user);
    renderStats();
    elements.profileSavedMessage.textContent = "Dados salvos com sucesso.";
    setTimeout(() => (elements.profileSavedMessage.textContent = ""), 2600);
  } catch (error) {
    showToast(error.message);
  }
}

async function submitTvPanel(event) {
  event.preventDefault();
  state.tv = {
    ...state.tv,
    mechanic: elements.tvMechanic.value.trim(),
    queue: elements.tvQueue.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    notice: elements.tvNotice.value.trim(),
    highlight: elements.tvHighlight.value.trim(),
    audioMuted: elements.tvAudioMuted.checked,
    queueSource: elements.tvQueueSource.value,
    playlist: state.tv.playlist || [],
  };

  try {
    const { tv } = await api("/api/tv", {
      method: "PUT",
      body: JSON.stringify(state.tv),
    });
    state.tv = tv;
    renderTvPanel();
    elements.tvSavedMessage.textContent = "Painel TV atualizado.";
    setTimeout(() => (elements.tvSavedMessage.textContent = ""), 2600);
  } catch (error) {
    showToast(error.message);
  }
}

function addYoutubeMedia() {
  const url = elements.youtubeUrl.value.trim();
  if (!url) {
    showToast("Informe o link do YouTube.");
    return;
  }
  state.tv.playlist ||= [];
  state.tv.playlist.push({
    id: crypto.randomUUID(),
    type: "youtube",
    title: "Vídeo do YouTube",
    url,
  });
  elements.youtubeUrl.value = "";
  renderPlaylist();
}

async function uploadLocalVideo() {
  const file = elements.localVideo.files[0];
  if (!file) {
    showToast("Selecione um vídeo do computador.");
    return;
  }
  if (!file.type.startsWith("video/")) {
    showToast("Selecione um arquivo de vídeo.");
    return;
  }

  elements.uploadVideoButton.disabled = true;
  elements.uploadVideoButton.textContent = "Enviando...";
  try {
    const response = await fetch(`/api/tv/media?title=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível enviar o vídeo.");
    state.tv.playlist ||= [];
    state.tv.playlist.push(body.media);
    elements.localVideo.value = "";
    renderPlaylist();
    showToast("Vídeo adicionado ao painel.");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.uploadVideoButton.disabled = false;
    elements.uploadVideoButton.textContent = "Enviar vídeo";
  }
}

function addReportField(container, label, value) {
  const field = document.createElement("div");
  field.append(createElement("strong", "", label));
  field.append(createElement("span", "", value || "Não informado"));
  container.append(field);
}

function createReportTool(tool, index) {
  const item = createElement("article", "report-tool");
  const photo = createElement("div", "report-tool-photo");
  if (tool.photo) {
    const image = document.createElement("img");
    image.src = tool.photo;
    image.alt = "";
    photo.append(image);
  } else {
    photo.append(createElement("span", "", "🔧"));
  }

  const info = document.createElement("div");
  info.append(createElement("h3", "", `${index + 1}. ${tool.name}`));
  const grid = createElement("div", "report-tool-grid");
  const details = [
    ["Categoria", tool.category],
    ["Marca / modelo", [tool.brand, tool.model].filter(Boolean).join(" / ") || "Não informado"],
    ["Aquisição", formatDate(tool.date)],
    ["Valor", tool.price ? formatCurrency(tool.price) : "Não informado"],
    ["Número de série", tool.serial || "Não informado"],
  ];

  details.forEach(([label, value]) => {
    const detail = document.createElement("span");
    const bold = createElement("b", "", `${label}: `);
    detail.append(bold, document.createTextNode(value));
    grid.append(detail);
  });
  info.append(grid);
  if (tool.notes) info.append(createElement("p", "report-tool-notes", `Observações: ${tool.notes}`));
  item.append(photo, info);
  return item;
}

function printReport() {
  const today = formatToday();
  const totalValue = state.tools.reduce((sum, tool) => sum + Number(tool.price || 0), 0);
  const categories = new Set(state.tools.map((tool) => tool.category)).size;
  elements.reportDate.textContent = `Emitido em ${today}`;
  elements.reportFooterDate.textContent = today;

  elements.reportOwner.replaceChildren();
  addReportField(elements.reportOwner, "Mecânico", state.profile.name);
  addReportField(elements.reportOwner, "Especialidade", state.profile.specialty);
  addReportField(elements.reportOwner, "Oficina / empresa", state.profile.shop);
  addReportField(elements.reportOwner, "Telefone", state.profile.phone);

  elements.reportSummary.replaceChildren();
  [
    ["Ferramentas cadastradas", state.tools.length],
    ["Categorias", categories],
    ["Valor total registrado", formatCurrency(totalValue)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.append(createElement("span", "", label));
    item.append(createElement("strong", "", value));
    elements.reportSummary.append(item);
  });

  const sortedTools = [...state.tools].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  elements.reportTools.replaceChildren(...sortedTools.map(createReportTool));
  window.print();
}

function showSection(sectionName) {
  const titles = {
    inventory: "Inventário",
    profile: "Meus dados",
    tv: "Painel TV",
    team: state.user?.role === "owner" ? "Gestores/clientes" : "Equipe/Fila",
    attendance: "Presença",
  };
  elements.inventorySection.classList.toggle("active", sectionName === "inventory");
  elements.profileSection.classList.toggle("active", sectionName === "profile");
  elements.tvSection.classList.toggle("active", sectionName === "tv");
  elements.teamSection.classList.toggle("active", sectionName === "team");
  elements.attendanceSection.classList.toggle("active", sectionName === "attendance");
  elements.pageTitle.textContent = titles[sectionName] || "Inventário";
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });
  elements.sidebar.classList.remove("open");
}

async function submitTeam(event) {
  event.preventDefault();
  try {
    const body = {
      name: elements.teamName.value.trim(),
      email: elements.teamEmail.value.trim(),
      password: elements.teamPassword.value,
      organizationName: elements.organizationName.value.trim(),
    };
    const { user } = await api("/api/team", {
      method: "POST",
      body: JSON.stringify(body),
    });
    state.team.push(user);
    elements.teamForm.reset();
    renderTeam();
    elements.teamSavedMessage.textContent =
      state.user.role === "owner" ? "Gestor cadastrado." : "Colaborador cadastrado.";
    setTimeout(() => (elements.teamSavedMessage.textContent = ""), 2600);
  } catch (error) {
    showToast(error.message);
  }
}

async function checkIn() {
  try {
    state.attendance = await api("/api/attendance/check-in", { method: "POST" });
    renderAttendance();
    showToast("Presença marcada. Você entrou na fila.");
  } catch (error) {
    showToast(error.message);
  }
}

async function checkOut() {
  try {
    state.attendance = await api("/api/attendance/check-out", { method: "POST" });
    renderAttendance();
    showToast("Você saiu da fila.");
  } catch (error) {
    showToast(error.message);
  }
}

async function toggleAttendance() {
  if (state.attendance.mine) {
    await checkOut();
    return;
  }
  await checkIn();
}

async function submitLogin(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  try {
    const { user } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: elements.loginEmail.value,
        password: elements.loginPassword.value,
      }),
    });
    showAuthenticated(user);
    await refreshRoleData();
    renderProfile();
    renderAll();
    elements.loginForm.reset();
  } catch (error) {
    elements.loginError.textContent = error.message;
  }
}

async function submitRegister(event) {
  event.preventDefault();
  elements.registerError.textContent = "";
  try {
    const { user } = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: elements.registerName.value,
        email: elements.registerEmail.value,
        password: elements.registerPassword.value,
        ownerSetupKey: elements.ownerSetupKey.value,
      }),
    });
    state.tools = [];
    showAuthenticated(user);
    await refreshRoleData();
    renderProfile();
    renderAll();
    elements.registerForm.reset();
    showToast("Conta criada com sucesso.");
  } catch (error) {
    elements.registerError.textContent = error.message;
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    showAuth();
  }
}

async function installApp() {
  if (!state.installPrompt) {
    window.alert(
      "No iPhone, abra este site no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início. No Android, abra o menu do navegador e escolha Instalar aplicativo.",
    );
    return;
  }
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  elements.installButton.hidden = true;
}

document.querySelectorAll("#addToolButton, #emptyAddButton").forEach((button) => {
  button.addEventListener("click", () => openToolModal());
});
document.querySelectorAll("#reportButton, #sidebarReportButton").forEach((button) => {
  button.addEventListener("click", printReport);
});
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showSection(button.dataset.section));
});
document.querySelector("#mobileMenu").addEventListener("click", () => elements.sidebar.classList.toggle("open"));
document.querySelector("#closeModalButton").addEventListener("click", closeToolModal);
document.querySelector("#cancelModalButton").addEventListener("click", closeToolModal);
document.querySelector("#photoPreview").addEventListener("click", () => elements.toolPhoto.click());
document.querySelector("#removePhotoButton").addEventListener("click", () => {
  state.currentPhoto = "";
  elements.toolPhoto.value = "";
  updatePhotoPreview();
});
elements.toolModal.addEventListener("click", (event) => {
  if (event.target === elements.toolModal) closeToolModal();
});
elements.toolPhoto.addEventListener("change", async () => {
  const file = elements.toolPhoto.files[0];
  if (!file) return;
  try {
    state.currentPhoto = await compressImage(file);
    updatePhotoPreview();
  } catch {
    showToast("Não foi possível carregar esta imagem.");
  }
});
elements.toolForm.addEventListener("submit", submitTool);
elements.profileForm.addEventListener("submit", submitProfile);
elements.tvForm.addEventListener("submit", submitTvPanel);
elements.teamForm.addEventListener("submit", submitTeam);
elements.loginForm.addEventListener("submit", submitLogin);
elements.registerForm.addEventListener("submit", submitRegister);
elements.loginTab.addEventListener("click", () => switchAuthTab("login"));
elements.registerTab.addEventListener("click", () => switchAuthTab("register"));
elements.logoutButton.addEventListener("click", logout);
elements.installButton.addEventListener("click", installApp);
elements.openTvButton.addEventListener("click", () => {
  const suffix = state.user?.organizationSlug ? `?org=${encodeURIComponent(state.user.organizationSlug)}` : "";
  window.open(`/tv${suffix}`, "_blank", "noopener");
});
elements.addYoutubeButton.addEventListener("click", addYoutubeMedia);
elements.uploadVideoButton.addEventListener("click", uploadLocalVideo);
elements.checkInButton.addEventListener("click", toggleAttendance);
elements.searchInput.addEventListener("input", renderTools);
elements.categoryFilter.addEventListener("change", renderTools);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.toolModal.classList.contains("open")) closeToolModal();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  elements.installButton.hidden = false;
});

window.addEventListener("appinstalled", () => {
  state.installPrompt = null;
  elements.installButton.hidden = true;
  showToast("Aplicativo instalado.");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
}

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
if (!isStandalone && isAppleMobile) elements.installButton.hidden = false;

loadApp();
