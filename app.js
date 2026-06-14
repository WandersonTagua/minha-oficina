const state = {
  user: null,
  tools: [],
  mechanicTools: [],
  services: {
    availableMechanics: [],
    active: [],
    mine: [],
    history: [],
    all: [],
  },
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
  registrationInvites: [],
  teamMode: "list",
  inviteToken: "",
  profileEditing: false,
  attendance: {
    queue: [],
    mine: null,
  },
  currentPhoto: "",
  installPrompt: null,
  servicesPollTimer: null,
  pushPublicKey: "",
};

const elements = {
  loginForm: document.querySelector("#loginForm"),
  authCard: document.querySelector(".auth-card"),
  inviteRegisterForm: document.querySelector("#inviteRegisterForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginError: document.querySelector("#loginError"),
  inviteRegisterError: document.querySelector("#inviteRegisterError"),
  inviteManagerName: document.querySelector("#inviteManagerName"),
  inviteManagerEmail: document.querySelector("#inviteManagerEmail"),
  inviteManagerPassword: document.querySelector("#inviteManagerPassword"),
  inviteOrganizationName: document.querySelector("#inviteOrganizationName"),
  inviteOrganizationLegalName: document.querySelector("#inviteOrganizationLegalName"),
  inviteOrganizationCnpj: document.querySelector("#inviteOrganizationCnpj"),
  inviteOrganizationPhone: document.querySelector("#inviteOrganizationPhone"),
  inviteOrganizationEmail: document.querySelector("#inviteOrganizationEmail"),
  inviteOrganizationAddress: document.querySelector("#inviteOrganizationAddress"),
  inviteOrganizationCity: document.querySelector("#inviteOrganizationCity"),
  inviteOrganizationState: document.querySelector("#inviteOrganizationState"),
  inviteOrganizationLogo: document.querySelector("#inviteOrganizationLogo"),
  inviteTermsAccepted: document.querySelector("#inviteTermsAccepted"),
  installButton: document.querySelector("#installButton"),
  logoutButton: document.querySelector("#logoutButton"),
  accountName: document.querySelector("#accountName"),
  accountEmail: document.querySelector("#accountEmail"),
  accountAvatar: document.querySelector("#accountAvatar"),
  sidebar: document.querySelector(".sidebar"),
  topbarEyebrow: document.querySelector("#topbarEyebrow"),
  pageTitle: document.querySelector("#pageTitle"),
  homeSection: document.querySelector("#homeSection"),
  inventorySection: document.querySelector("#inventorySection"),
  profileSection: document.querySelector("#profileSection"),
  tvSection: document.querySelector("#tvSection"),
  teamSection: document.querySelector("#teamSection"),
  teamNavLabel: document.querySelector("#teamNavLabel"),
  attendanceSection: document.querySelector("#attendanceSection"),
  serviceHistorySection: document.querySelector("#serviceHistorySection"),
  welcomeName: document.querySelector("#welcomeName"),
  totalTools: document.querySelector("#totalTools"),
  totalValue: document.querySelector("#totalValue"),
  recentTools: document.querySelector("#recentTools"),
  inventoryTitle: document.querySelector("#inventoryTitle"),
  inventorySubtitle: document.querySelector("#inventorySubtitle"),
  toolsGrid: document.querySelector("#toolsGrid"),
  emptyState: document.querySelector("#emptyState"),
  mechanicToolsSection: document.querySelector("#mechanicToolsSection"),
  mechanicToolsList: document.querySelector("#mechanicToolsList"),
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
  profileView: document.querySelector("#profileView"),
  profileEditButton: document.querySelector("#profileEditButton"),
  profileSectionTitle: document.querySelector("#profileSectionTitle"),
  profileSectionSubtitle: document.querySelector("#profileSectionSubtitle"),
  profileViewName: document.querySelector("#profileViewName"),
  profileViewShop: document.querySelector("#profileViewShop"),
  profileViewSpecialty: document.querySelector("#profileViewSpecialty"),
  profileViewPhone: document.querySelector("#profileViewPhone"),
  profileViewEmail: document.querySelector("#profileViewEmail"),
  profileName: document.querySelector("#profileName"),
  profileSpecialty: document.querySelector("#profileSpecialty"),
  profilePhone: document.querySelector("#profilePhone"),
  profileShop: document.querySelector("#profileShop"),
  workshopLocationField: document.querySelector("#workshopLocationField"),
  useWorkshopLocationButton: document.querySelector("#useWorkshopLocationButton"),
  workshopLocationText: document.querySelector("#workshopLocationText"),
  workshopLatitude: document.querySelector("#workshopLatitude"),
  workshopLongitude: document.querySelector("#workshopLongitude"),
  profileSavedMessage: document.querySelector("#profileSavedMessage"),
  tvForm: document.querySelector("#tvForm"),
  tvMechanic: document.querySelector("#tvMechanic"),
  tvNotice: document.querySelector("#tvNotice"),
  tvHighlight: document.querySelector("#tvHighlight"),
  tvAudioMuted: document.querySelector("#tvAudioMuted"),
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
  organizationLegalNameField: document.querySelector("#organizationLegalNameField"),
  organizationLegalName: document.querySelector("#organizationLegalName"),
  organizationCnpjField: document.querySelector("#organizationCnpjField"),
  organizationCnpj: document.querySelector("#organizationCnpj"),
  organizationPhoneField: document.querySelector("#organizationPhoneField"),
  organizationPhone: document.querySelector("#organizationPhone"),
  organizationEmailField: document.querySelector("#organizationEmailField"),
  organizationEmail: document.querySelector("#organizationEmail"),
  organizationAddressField: document.querySelector("#organizationAddressField"),
  organizationAddress: document.querySelector("#organizationAddress"),
  organizationCityField: document.querySelector("#organizationCityField"),
  organizationCity: document.querySelector("#organizationCity"),
  organizationStateField: document.querySelector("#organizationStateField"),
  organizationState: document.querySelector("#organizationState"),
  organizationLogoField: document.querySelector("#organizationLogoField"),
  organizationLogo: document.querySelector("#organizationLogo"),
  organizationTermsField: document.querySelector("#organizationTermsField"),
  organizationTermsAccepted: document.querySelector("#organizationTermsAccepted"),
  organizationTermsBox: document.querySelector("#organizationTermsBox"),
  subscriptionPlanField: document.querySelector("#subscriptionPlanField"),
  subscriptionPlan: document.querySelector("#subscriptionPlan"),
  teamPanels: document.querySelector("#teamPanels"),
  managerAttendancePanel: document.querySelector("#managerAttendancePanel"),
  teamTitle: document.querySelector("#teamTitle"),
  teamSubtitle: document.querySelector("#teamSubtitle"),
  teamFormTitle: document.querySelector("#teamFormTitle"),
  teamFormHelp: document.querySelector("#teamFormHelp"),
  teamFormToggleButton: document.querySelector("#teamFormToggleButton"),
  ownerInviteBox: document.querySelector("#ownerInviteBox"),
  inviteLinkBox: document.querySelector("#inviteLinkBox"),
  generatedInviteLink: document.querySelector("#generatedInviteLink"),
  copyInviteLinkButton: document.querySelector("#copyInviteLinkButton"),
  teamSubmitButton: document.querySelector("#teamSubmitButton"),
  teamSavedMessage: document.querySelector("#teamSavedMessage"),
  teamListTitle: document.querySelector("#teamListTitle"),
  teamList: document.querySelector("#teamList"),
  managerAttendanceList: document.querySelector("#managerAttendanceList"),
  attendanceStatusText: document.querySelector("#attendanceStatusText"),
  checkInButton: document.querySelector("#checkInButton"),
  checkOutButton: document.querySelector("#checkOutButton"),
  enableNotificationsButton: document.querySelector("#enableNotificationsButton"),
  employeeAttendanceList: document.querySelector("#employeeAttendanceList"),
  availableMechanicsList: document.querySelector("#availableMechanicsList"),
  activeServicesList: document.querySelector("#activeServicesList"),
  dispatchServiceForm: document.querySelector("#dispatchServiceForm"),
  dispatchMechanic: document.querySelector("#dispatchMechanic"),
  dispatchTitle: document.querySelector("#dispatchTitle"),
  dispatchNotes: document.querySelector("#dispatchNotes"),
  plateSearchInput: document.querySelector("#plateSearchInput"),
  plateSearchResults: document.querySelector("#plateSearchResults"),
  employeeServicesList: document.querySelector("#employeeServicesList"),
  serviceHistoryList: document.querySelector("#serviceHistoryList"),
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

function showAuth() {
  state.user = null;
  state.tools = [];
  state.mechanicTools = [];
  state.services = { availableMechanics: [], active: [], mine: [], history: [], all: [] };
  state.profileEditing = false;
  stopServicesPolling();
  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  elements.loginError.textContent = "";
  showInviteRegister(Boolean(state.inviteToken));
}

function findInviteTokenFromUrl() {
  const pathMatch = window.location.pathname.match(/^\/cadastro\/([^/]+)$/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);
  return new URLSearchParams(window.location.search).get("convite") || "";
}

function showInviteRegister(show) {
  elements.authCard.classList.toggle("auth-invite-card", show);
  elements.loginForm.hidden = show;
  elements.loginForm.classList.toggle("active", !show);
  elements.inviteRegisterForm.hidden = !show;
  elements.inviteRegisterForm.classList.toggle("active", show);
}

function showAuthenticated(user) {
  state.user = user;
  state.profile = {
    name: user.profile?.name || user.name || "",
    specialty: user.profile?.specialty || "",
    phone: user.profile?.phone || "",
    shop: user.profile?.shop || user.organizationName || "",
  };
  elements.accountName.textContent = user.name;
  elements.accountEmail.textContent = user.email;
  elements.accountAvatar.textContent = user.name?.charAt(0).toLocaleUpperCase("pt-BR") || "M";
  document.body.classList.remove("auth-pending");
  document.body.classList.add("authenticated");
  renderOrganizationBrand();
}

function renderOrganizationBrand() {
  const logo = state.user?.organizationLogo || "";
  document.querySelectorAll(".app-shell .brand-mark, .report .brand-mark").forEach((mark) => {
    mark.classList.toggle("has-logo", Boolean(logo));
    mark.replaceChildren();
    if (logo) {
      const image = document.createElement("img");
      image.src = logo;
      image.alt = state.user?.organizationName || "Logotipo da oficina";
      mark.append(image);
    } else {
      mark.append(createElement("span", "", "MO"));
    }
  });
}

function supportsPushNotifications() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function samePushKey(currentKey, expectedKey) {
  if (!currentKey || !expectedKey) return false;
  const current = new Uint8Array(currentKey);
  const expected = expectedKey instanceof Uint8Array ? expectedKey : new Uint8Array(expectedKey);
  return current.length === expected.length && current.every((value, index) => value === expected[index]);
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este celular não suporta localização."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
      ...options,
    });
  });
}

function locationText(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "Nenhuma localização cadastrada. Raio padrão: 150m.";
  }
  return `Localização cadastrada (${latitude.toFixed(5)}, ${longitude.toFixed(5)}). Raio: 150m.`;
}

async function getPushPublicKey() {
  if (state.pushPublicKey) return state.pushPublicKey;
  const { publicKey } = await api("/api/push/public-key");
  state.pushPublicKey = publicKey;
  return publicKey;
}

async function updateNotificationButton() {
  if (!elements.enableNotificationsButton) return;
  const visible = state.user?.role === "employee" && supportsPushNotifications();
  elements.enableNotificationsButton.hidden = !visible;
  if (!visible) return;

  if (Notification.permission === "granted") {
    elements.enableNotificationsButton.textContent = "Notificações ativadas";
    elements.enableNotificationsButton.disabled = false;
    return;
  }
  if (Notification.permission === "denied") {
    elements.enableNotificationsButton.textContent = "Notificações bloqueadas";
    elements.enableNotificationsButton.disabled = true;
    return;
  }
  elements.enableNotificationsButton.textContent = "Ativar notificações";
  elements.enableNotificationsButton.disabled = false;
}

async function enablePushNotifications() {
  if (!supportsPushNotifications()) {
    showToast("Este navegador não suporta notificações do app.");
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await updateNotificationButton();
      showToast("Permissão de notificação não foi liberada.");
      return;
    }
    await syncPushSubscription();
    await updateNotificationButton();
    showToast("Notificações ativadas.");
  } catch (error) {
    showToast(error.message || "Não foi possível ativar as notificações.");
  }
}

async function syncPushSubscription() {
  if (!supportsPushNotifications() || state.user?.role !== "employee" || Notification.permission !== "granted") {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const publicKey = await getPushPublicKey();
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && !samePushKey(subscription.options?.applicationServerKey, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await api("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });
}

async function syncPushSubscriptionQuietly() {
  try {
    await syncPushSubscription();
  } catch {
    // A tela continua funcionando; o usuário ainda pode tocar em "Notificações ativadas" para tentar novamente.
  }
}

async function loadApp() {
  state.inviteToken = findInviteTokenFromUrl();
  if (state.inviteToken) {
    showAuth();
    return;
  }
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
    const [{ tools }, attendance, services] = await Promise.all([
      api("/api/tools"),
      api("/api/attendance"),
      api("/api/services"),
    ]);
    state.tools = tools;
    state.mechanicTools = [];
    state.attendance = attendance;
    state.services = {
      availableMechanics: [],
      active: [],
      mine: services.mine || [],
      history: services.history || [],
    };
    renderAttendance();
    renderServices();
    updateNotificationButton();
    syncPushSubscriptionQuietly();
    showSection("attendance");
    startServicesPolling();
    return;
  }

  const tvPath = state.user.organizationSlug
    ? `/api/tv?org=${encodeURIComponent(state.user.organizationSlug)}`
    : "/api/tv";
  const [{ tools, mechanicTools = [] }, { tv }, team, attendance, services] = await Promise.all([
    api("/api/tools"),
    api(tvPath),
    api("/api/team"),
    api("/api/attendance"),
    api("/api/services"),
  ]);
  state.tools = tools;
  state.mechanicTools = mechanicTools;
  state.tv = tv;
  state.team = team.users || [];
  state.registrationInvites = team.invites || [];
  state.attendance = attendance;
  state.services = {
    availableMechanics: services.availableMechanics || [],
    active: services.active || [],
    mine: services.mine || [],
    history: services.history || [],
    all: services.all || [],
  };
  renderTvPanel();
  renderTeam();
  renderAttendance();
  renderServices();
  updateNotificationButton();
  if (state.user.role === "owner") showSection("team");
  if (state.user.role === "manager") showSection("home");
  startServicesPolling();
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

function setServicesFromPayload(services, fallback = state.services) {
  state.services = {
    availableMechanics: services.availableMechanics || [],
    active: services.active || [],
    mine: services.mine || [],
    history: services.history || fallback.history || [],
    all: services.all || fallback.all || [],
  };
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
  const inventoryTools = getVisibleInventoryTools();
  const totalValue = inventoryTools.reduce((sum, tool) => sum + Number(tool.price || 0), 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = inventoryTools.filter((tool) => new Date(tool.createdAt) >= thirtyDaysAgo).length;

  elements.totalTools.textContent = inventoryTools.length;
  elements.totalValue.textContent = formatCurrency(totalValue);
  elements.recentTools.textContent = recent;
  elements.welcomeName.textContent = state.profile.name?.split(" ")[0] || "mecânico";
}

function updateCategoryFilter() {
  const selected = elements.categoryFilter.value;
  const categories = [...new Set(getVisibleInventoryTools().map((tool) => tool.category).filter(Boolean))].sort();

  elements.categoryFilter.replaceChildren();
  elements.categoryFilter.append(new Option("Todas as categorias", ""));
  categories.forEach((category) => elements.categoryFilter.append(new Option(category, category)));
  elements.categoryFilter.value = categories.includes(selected) ? selected : "";
}

function getVisibleInventoryTools() {
  const mechanicTools = state.user?.role === "manager"
    ? state.mechanicTools.flatMap((mechanic) => mechanic.tools || [])
    : [];
  return [...state.tools, ...mechanicTools];
}

function filterTools(tools) {
  const search = elements.searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const category = elements.categoryFilter.value;
  return tools
    .filter((tool) => {
      const searchable = [tool.name, tool.brand, tool.model, tool.category, tool.serial, tool.notes]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return (!search || searchable.includes(search)) && (!category || tool.category === category);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function formatToolCount(count) {
  return count === 1 ? "1 item" : `${count} itens`;
}

function createToolCard(tool, options = {}) {
  const readOnly = Boolean(options.readOnly);
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
  if (!readOnly) {
    const editButton = createElement("button", "card-action", "Editar");
    editButton.type = "button";
    editButton.addEventListener("click", () => openToolModal(tool));
    const deleteButton = createElement("button", "card-action danger", "Excluir");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteTool(tool.id));
    actions.append(editButton, deleteButton);
  }
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
  if (tool.serial) {
    const serialMeta = document.createElement("div");
    serialMeta.append(createElement("span", "", "Série"));
    serialMeta.append(createElement("strong", "", tool.serial));
    meta.append(serialMeta);
  }
  body.append(top, subtitle, meta);
  if (tool.notes) body.append(createElement("p", "tool-card-notes", tool.notes));
  card.append(photo, body);
  return card;
}

function renderTools() {
  const visibleTools = filterTools(state.tools);
  const isManager = state.user?.role === "manager";
  elements.inventoryTitle.textContent = isManager ? "Ferramentas da oficina" : "Minhas ferramentas";
  elements.inventorySubtitle.textContent = isManager
    ? "Cadastre aqui as ferramentas pertencentes à oficina."
    : "Consulte e mantenha seu inventário atualizado.";

  elements.toolsGrid.replaceChildren(...visibleTools.map(createToolCard));
  elements.emptyState.classList.toggle("visible", visibleTools.length === 0);

  const emptyTitle = elements.emptyState.querySelector("h3");
  const emptyText = elements.emptyState.querySelector("p");
  const isFiltered = Boolean(elements.searchInput.value.trim() || elements.categoryFilter.value);
  emptyTitle.textContent = isFiltered
    ? "Nenhuma ferramenta encontrada"
    : isManager
      ? "Nenhuma ferramenta da oficina cadastrada"
      : "Sua bancada digital começa aqui";
  emptyText.textContent = isFiltered
    ? "Tente buscar por outro nome ou remova os filtros."
    : isManager
      ? "Cadastre as ferramentas que pertencem à oficina neste espaço."
      : "Cadastre sua primeira ferramenta para começar a montar o inventário.";
  renderMechanicTools();
}

function renderMechanicTools() {
  const isManager = state.user?.role === "manager";
  elements.mechanicToolsSection.hidden = !isManager;
  if (!isManager) {
    elements.mechanicToolsList.replaceChildren();
    return;
  }

  if (!state.mechanicTools.length) {
    elements.mechanicToolsList.replaceChildren(
      createElement("p", "tool-card-subtitle", "Nenhum colaborador cadastrado ainda."),
    );
    return;
  }

  const hasActiveFilter = Boolean(elements.searchInput.value.trim() || elements.categoryFilter.value);
  elements.mechanicToolsList.replaceChildren(
    ...state.mechanicTools.map((mechanic) => {
      const filteredTools = filterTools(mechanic.tools || []);
      const details = document.createElement("details");
      details.className = "mechanic-tools-panel";
      details.open = hasActiveFilter && filteredTools.length > 0;

      const summary = document.createElement("summary");
      const title = document.createElement("span");
      title.append(createElement("strong", "", `Ferramentas de ${mechanic.name}`));
      title.append(createElement("small", "", mechanic.email));
      const count = createElement("span", "mechanic-tools-count", formatToolCount(filteredTools.length));
      summary.append(title, count);

      const content = createElement("div", "mechanic-tools-content");
      if (!filteredTools.length) {
        content.append(
          createElement(
            "p",
            "tool-card-subtitle",
            hasActiveFilter ? "Nenhuma ferramenta encontrada para este filtro." : "Nenhuma ferramenta cadastrada.",
          ),
        );
      } else {
        const grid = createElement("div", "tools-grid mechanic-tools-grid");
        grid.replaceChildren(...filteredTools.map((tool) => createToolCard(tool, { readOnly: true })));
        content.append(grid);
      }

      details.append(summary, content);
      return details;
    }),
  );
}

function renderAll() {
  renderStats();
  updateCategoryFilter();
  renderTools();
  renderServices();
}

function renderTvPanel() {
  elements.tvMechanic.value = state.tv.mechanic || "";
  elements.tvNotice.value = state.tv.notice || "";
  elements.tvHighlight.value = state.tv.highlight || "";
  elements.tvAudioMuted.checked = state.tv.audioMuted !== false;
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
  if (role !== "owner") state.teamMode = "list";
  document.querySelectorAll("[data-section]").forEach((button) => {
    const section = button.dataset.section;
    const managerSections = ["home", "inventory", "profile", "tv", "team"];
    const employeeSections = ["inventory", "attendance", "serviceHistory"];
    const ownerSections = ["team"];
    const visible =
      (role === "owner" && ownerSections.includes(section)) ||
      (role === "manager" && managerSections.includes(section)) ||
      (role === "employee" && employeeSections.includes(section));
    button.hidden = !visible || (button.hasAttribute("data-owner-only") && role !== "owner");
    if (role !== "owner" && button.dataset.teamMode === "create") button.hidden = true;
  });
  document.querySelector('[data-section="attendance"]').style.order = role === "employee" ? "-1" : "";
  document.querySelector('[data-section="inventory"]').style.order = role === "employee" ? "1" : "";

  setOrganizationRegistrationFieldsVisible(role === "owner");
  elements.topbarEyebrow.textContent =
    role === "owner" ? "GESTÃO DO SITE" : role === "manager" ? "GESTÃO DA OFICINA" : "PAINEL DO MECÂNICO";
  elements.teamFormTitle.textContent = role === "owner" ? "Gerar link de cadastro" : "Cadastrar colaborador";
  elements.teamFormHelp.textContent =
    role === "owner"
      ? "O cliente preencherá os dados cadastrais e aguardará sua liberação."
      : "O colaborador usará o celular para marcar presença.";
  elements.teamSubmitButton.textContent = role === "owner" ? "Cadastrar gestor" : "Cadastrar colaborador";
  elements.teamFormToggleButton.hidden = role === "owner";
  setTeamFormCollapsed(role !== "owner");
  elements.teamNavLabel.textContent = role === "owner" ? "Clientes/Oficinas" : "Equipe/Fila";
  document.querySelector("#addToolButton").hidden = role !== "manager";
  document.querySelector("#reportButton").hidden = role !== "manager";
  document.querySelector("#sidebarReportButton").hidden = role !== "manager";
  document.querySelector(".sidebar-card").hidden = role !== "manager";
  updateTeamLayout();
}

function setOrganizationRegistrationFieldsVisible(visible) {
  [
    elements.organizationField,
    elements.organizationLegalNameField,
    elements.organizationCnpjField,
    elements.organizationPhoneField,
    elements.organizationEmailField,
    elements.organizationAddressField,
    elements.organizationCityField,
    elements.organizationStateField,
    elements.organizationLogoField,
    elements.subscriptionPlanField,
    elements.organizationTermsField,
    elements.organizationTermsBox,
  ].forEach((field) => {
    if (field) field.hidden = !visible;
  });
}

function setTeamFormCollapsed(collapsed) {
  if (!elements.teamForm || !elements.teamFormToggleButton) return;
  elements.teamForm.classList.toggle("is-collapsed", collapsed);
  elements.teamFormToggleButton.textContent = collapsed ? "Adicionar colaborador" : "Fechar";
  elements.teamFormToggleButton.setAttribute("aria-expanded", String(!collapsed));
}

function setOwnerInviteMode(active) {
  const isActive = Boolean(active && state.user?.role === "owner");
  elements.ownerInviteBox.hidden = !isActive;
  elements.ownerInviteBox.classList.toggle("is-active", isActive);
  const formGrid = elements.teamForm.querySelector(".form-grid");
  formGrid.hidden = isActive;
  formGrid.querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = isActive;
  });
  elements.teamForm.querySelector(".form-footer").hidden = isActive;
  if (!isActive) elements.inviteLinkBox.hidden = true;
}

function toggleTeamForm() {
  setTeamFormCollapsed(!elements.teamForm.classList.contains("is-collapsed"));
}

function renderTeam() {
  if (!elements.teamList) return;
  updateTeamLayout();
  if (!state.team.length) {
    const emptyText = state.user?.role === "owner"
      ? "Nenhuma oficina cadastrada ainda."
      : "Nenhum usuário cadastrado ainda.";
    elements.teamList.replaceChildren(createElement("p", "tool-card-subtitle", emptyText));
    return;
  }
  if (state.user?.role === "owner") {
    const pendingCards = (state.registrationInvites || [])
      .filter((invite) => invite.status === "submitted")
      .map(createPendingInviteCard);
    const clientCards = state.team.map(createOwnerClientCard);
    elements.teamList.replaceChildren(...pendingCards, ...clientCards);
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

function createPendingInviteCard(invite) {
  const submission = invite.submission || {};
  const row = createElement("div", "client-office-card pending-office-card");
  const header = createElement("div", "client-office-header");
  const avatar = createElement("span", "account-avatar", submission.organizationName?.charAt(0).toLocaleUpperCase("pt-BR") || "P");
  if (submission.organizationLogo) {
    const logo = document.createElement("img");
    logo.src = submission.organizationLogo;
    logo.alt = `Logo ${submission.organizationName || "oficina"}`;
    avatar.classList.add("has-logo");
    avatar.replaceChildren(logo);
  }
  const info = document.createElement("div");
  info.append(createElement("strong", "", submission.organizationName || "Cadastro pendente"));
  info.append(createElement("small", "", `${submission.managerName || "Gestor"} · ${submission.managerEmail || ""}`));
  header.append(avatar, info, createElement("span", "subscription-chip is-pending", "Pendente"));

  const details = createElement("div", "client-office-details");
  details.append(
    createElement("span", "", `CNPJ: ${formatCnpj(submission.organizationCnpj) || "Não informado"}`),
    createElement("span", "", `Contato: ${submission.organizationPhone || submission.organizationEmail || "Não informado"}`),
    createElement("span", "", `Cidade/UF: ${[submission.organizationCity, submission.organizationState].filter(Boolean).join("/") || "Não informado"}`),
    createElement("span", "", `Enviado em: ${formatDate(invite.submittedAt)}`),
  );

  const actions = createElement("div", "client-office-actions");
  const trialButton = createElement("button", "button button-secondary", "Liberar teste 7 dias");
  const monthlyButton = createElement("button", "button button-primary", "Liberar mensal");
  const annualButton = createElement("button", "button button-secondary", "Liberar anual");
  const rejectButton = createElement("button", "button button-danger", "Rejeitar");
  [
    [trialButton, "trial"],
    [monthlyButton, "monthly"],
    [annualButton, "annual"],
    [rejectButton, "reject"],
  ].forEach(([button, action]) => {
    button.type = "button";
    button.addEventListener("click", () => approveRegistrationInvite(invite.id, action));
  });
  actions.append(trialButton, monthlyButton, annualButton, rejectButton);
  row.append(header, details, actions);
  return row;
}

function updateTeamLayout() {
  const role = state.user?.role || "employee";
  const isOwner = role === "owner";
  if (!isOwner) state.teamMode = "list";
  const isCreateMode = isOwner && state.teamMode === "create";
  elements.teamForm.hidden = isOwner ? !isCreateMode : false;
  setOwnerInviteMode(isOwner && isCreateMode);
  elements.teamPanels.hidden = isOwner ? isCreateMode : false;
  elements.teamPanels.classList.toggle("owner-client-mode", isOwner);
  elements.managerAttendancePanel.hidden = isOwner;
  elements.teamTitle.textContent = isOwner
    ? isCreateMode ? "Gerar link de cadastro" : "Clientes/Oficinas"
    : "Colaboradores e fila";
  elements.teamSubtitle.textContent = isOwner
    ? isCreateMode
      ? "Envie o link para o cliente preencher os dados da oficina e aceitar os termos."
      : "Gerencie oficinas, planos de assinatura e acesso dos gestores."
    : "Cadastre colaboradores e acompanhe a ordem de chegada.";
  elements.teamListTitle.textContent = isOwner ? "Gestores cadastrados" : "Colaboradores cadastrados";
}

function planLabel(plan) {
  if (plan === "trial") return "Teste 7 dias";
  return plan === "annual" ? "Anual" : "Mensal";
}

function statusLabel(status) {
  return status === "blocked" ? "Bloqueado" : "Liberado";
}

function formatDate(value) {
  if (!value) return "Sem vencimento";
  return new Date(value).toLocaleDateString("pt-BR");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return digits;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function createOwnerClientCard(user) {
  const subscription = user.organizationSubscription || {};
  const row = createElement("div", "client-office-card");
  const header = createElement("div", "client-office-header");
  const avatar = createElement("span", "account-avatar", user.organizationName.charAt(0).toLocaleUpperCase("pt-BR") || user.name.charAt(0).toLocaleUpperCase("pt-BR"));
  if (user.organizationLogo) {
    const logo = document.createElement("img");
    logo.src = user.organizationLogo;
    logo.alt = `Logo ${user.organizationName || user.name}`;
    avatar.classList.add("has-logo");
    avatar.replaceChildren(logo);
  }
  const info = document.createElement("div");
  info.append(createElement("strong", "", user.organizationName || "Oficina sem nome"));
  info.append(createElement("small", "", `${user.organizationLegalName || user.name} · ${user.email}`));
  const status = createElement("span", `subscription-chip ${subscription.status === "blocked" ? "is-blocked" : "is-active"}`, statusLabel(subscription.status));
  header.append(avatar, info, status);

  const details = createElement("div", "client-office-details");
  details.append(
    createElement("span", "", `CNPJ: ${formatCnpj(user.organizationCnpj) || "Não informado"}`),
    createElement("span", "", `Contato: ${user.organizationPhone || user.organizationEmail || "Não informado"}`),
    createElement("span", "", `Cidade/UF: ${[user.organizationCity, user.organizationState].filter(Boolean).join("/") || "Não informado"}`),
    createElement("span", "", `Plano: ${planLabel(subscription.plan)}`),
    createElement("span", "", `Vence em: ${formatDate(subscription.expiresAt)}`),
  );

  const actions = createElement("div", "client-office-actions");
  const releaseButton = createElement("button", "button button-secondary", "Liberar");
  const renewButton = createElement("button", "button button-primary", "Renovar");
  const blockButton = createElement("button", "button button-danger", "Bloquear");
  [releaseButton, renewButton, blockButton].forEach((button) => {
    button.type = "button";
  });
  releaseButton.addEventListener("click", () => updateOrganizationSubscription(user.organizationId, "activate"));
  renewButton.addEventListener("click", () => updateOrganizationSubscription(user.organizationId, "renew"));
  blockButton.addEventListener("click", () => updateOrganizationSubscription(user.organizationId, "block"));
  actions.append(releaseButton, renewButton, blockButton);

  row.append(header, details, actions);
  return row;
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

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function serviceStatusLabel(status) {
  const labels = {
    pending: "Aguardando aceite",
    running: "Em execução",
    paused: "Pausado",
    approval_paused: "Pausado para aprovação",
    rejected: "Rejeitado",
    finished: "Finalizado",
  };
  return labels[status] || status;
}

function renderServices(options = {}) {
  renderAvailableMechanics();
  renderActiveServices();
  renderPlateSearchResults();
  renderEmployeeServices(options);
  renderServiceHistory();
}

function hasServiceFormInProgress() {
  return [...document.querySelectorAll(".service-response-form, .service-update-form")].some((form) => {
    if (form.contains(document.activeElement)) return true;
    const plate = form.elements.plate?.value.trim();
    const mileage = form.elements.mileage?.value.trim();
    const rejectionReason = form.elements.rejectionReason?.value.trim();
    const observation = form.elements.observation?.value.trim();
    const dashboardPhoto = form.elements.dashboardPhoto?.files?.length;
    const updatePhoto = form.elements.photo?.files?.length;
    return Boolean(plate || mileage || rejectionReason || observation || dashboardPhoto || updatePhoto);
  });
}

function renderAvailableMechanics() {
  if (!elements.availableMechanicsList) return;
  const queue = state.services.availableMechanics || [];
  elements.dispatchMechanic.replaceChildren(new Option("Selecione pela ordem da fila", ""));
  queue.forEach((mechanic, index) => {
    elements.dispatchMechanic.append(new Option(`${index + 1}. ${mechanic.name}`, mechanic.userId));
  });

  if (!queue.length) {
    elements.availableMechanicsList.replaceChildren(
      createElement("p", "tool-card-subtitle", "Nenhum mecânico disponível na fila agora."),
    );
    return;
  }

  elements.availableMechanicsList.replaceChildren(
    ...queue.map((mechanic, index) => {
      const row = createElement("div", "attendance-row");
      row.append(createElement("span", "attendance-position", String(index + 1)));
      const info = document.createElement("div");
      info.append(createElement("strong", "", mechanic.name));
      info.append(
        createElement(
          "small",
          "",
          `Chegou às ${new Date(mechanic.checkedInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        ),
      );
      row.append(info);
      return row;
    }),
  );
}

function createServiceSummary(service) {
  const item = createElement("article", "service-item");
  const top = createElement("div", "service-item-top");
  const title = document.createElement("div");
  title.append(createElement("strong", "", service.title));
  title.append(createElement("small", "", `${service.mechanicName} · ${formatDateTime(service.createdAt)}`));
  top.append(title, createElement("span", `service-status ${service.status}`, serviceStatusLabel(service.status)));
  item.append(top);
  if (service.notes) item.append(createElement("p", "", service.notes));
  if (service.plate || service.mileage) {
    item.append(createElement("small", "service-meta", `Placa ${service.plate || "-"} · Km ${service.mileage || "-"}`));
  }
  return item;
}

function createServicePhotoToggle(src, label) {
  const wrapper = createElement("div", "service-photo-toggle");
  const button = createElement("button", "service-photo-thumb", label);
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  const image = document.createElement("img");
  image.className = "service-photo";
  image.src = src;
  image.alt = label;
  image.hidden = true;
  button.addEventListener("click", () => {
    const expanded = image.hidden;
    image.hidden = !expanded;
    button.textContent = expanded ? "Ocultar foto" : label;
    button.setAttribute("aria-expanded", String(expanded));
  });
  wrapper.append(button, image);
  return wrapper;
}

function renderActiveServices() {
  if (!elements.activeServicesList) return;
  const services = state.services.active || [];
  if (!services.length) {
    elements.activeServicesList.replaceChildren(
      createElement("p", "tool-card-subtitle", "Nenhum serviço em execução no momento."),
    );
    return;
  }
  elements.activeServicesList.replaceChildren(...services.map(createServiceSummary));
}

function normalizePlate(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toLocaleUpperCase("pt-BR");
}

function createPlateSearchResult(service) {
  const card = createServiceSummary(service);
  card.classList.add("service-history-card");
  const closedAt = service.finishedAt || service.rejectedAt || service.acceptedAt || service.createdAt;
  if (closedAt) {
    card.append(createElement("small", "service-meta", `Última atualização: ${formatDateTime(closedAt)}`));
  }
  if (service.rejectionReason) {
    card.append(createElement("p", "service-history-note", `Motivo da rejeição: ${service.rejectionReason}`));
  }
  appendServiceUpdates(card, service);
  return card;
}

function renderPlateSearchResults() {
  if (!elements.plateSearchInput || !elements.plateSearchResults) return;
  if (state.user?.role !== "manager") return;
  const query = normalizePlate(elements.plateSearchInput.value);
  if (!query) {
    elements.plateSearchResults.replaceChildren(
      createElement("p", "tool-card-subtitle", "Digite uma placa para pesquisar nos serviços da oficina."),
    );
    return;
  }
  const results = (state.services.all || []).filter((service) => normalizePlate(service.plate).includes(query));
  if (!results.length) {
    elements.plateSearchResults.replaceChildren(createElement("p", "tool-card-subtitle", "Nenhum serviço encontrado para essa placa."));
    return;
  }
  elements.plateSearchResults.replaceChildren(...results.map(createPlateSearchResult));
}

function createPendingServiceCard(service) {
  const card = createServiceSummary(service);
  card.classList.add("service-pending-card");
  const form = createElement("form", "service-response-form");
  form.dataset.serviceId = service.id;
  form.innerHTML = `
    <label class="field">
      <span>Placa do veículo</span>
      <input name="plate" type="text" placeholder="ABC1D23" required />
    </label>
    <label class="field">
      <span>Quilometragem</span>
      <input name="mileage" type="number" min="0" placeholder="Ex.: 85420" required />
    </label>
    <label class="field">
      <span>Foto do painel em funcionamento</span>
      <input name="dashboardPhoto" type="file" accept="image/*" required />
    </label>
    <label class="field">
      <span>Motivo da rejeição</span>
      <textarea name="rejectionReason" rows="3" placeholder="Obrigatório se rejeitar"></textarea>
    </label>
    <div class="service-actions">
      <button class="button button-primary" type="submit">Aceitar serviço</button>
      <button class="button button-secondary" type="button" data-reject-service>Rejeitar</button>
    </div>
  `;
  form.addEventListener("submit", (event) => acceptService(event, service.id));
  form.querySelector("[data-reject-service]").addEventListener("click", () => rejectService(form, service.id));
  card.append(form);
  return card;
}

function createRunningServiceCard(service) {
  const card = createServiceSummary(service);
  if (service.status === "paused") {
    card.append(createElement("p", "", "Serviço pausado ao encerrar expediente. Marque presença e toque em retomar para continuar."));
    card.append(createResumeServiceActions(service));
    return card;
  }
  if (service.status === "approval_paused") {
    card.append(createElement("p", "", "Serviço pausado aguardando aprovação. Você voltou para o fim da fila."));
    card.append(createResumeServiceActions(service));
    return card;
  }
  if (service.dashboardPhoto) {
    card.append(createServicePhotoToggle(service.dashboardPhoto, `Ver foto do painel ${service.plate || ""}`.trim()));
  }
  appendServiceUpdates(card, service);
  card.append(createServiceUpdateForm(service));
  const finishButton = createElement("button", "button button-primary", "Encerrar serviço");
  finishButton.type = "button";
  finishButton.addEventListener("click", () => finishService(service.id));
  const approvalPauseButton = createElement("button", "button button-secondary", "Pausa para aprovação");
  approvalPauseButton.type = "button";
  approvalPauseButton.addEventListener("click", () => pauseServiceForApproval(service.id));
  const actions = createElement("div", "service-actions");
  actions.append(finishButton, approvalPauseButton);
  card.append(actions);
  return card;
}

function createResumeServiceActions(service) {
  const actions = createElement("div", "service-actions");
  const resumeButton = createElement("button", "button button-primary", "Retomar serviço");
  resumeButton.type = "button";
  resumeButton.disabled = !state.attendance.mine;
  resumeButton.addEventListener("click", () => resumeService(service.id));
  actions.append(resumeButton);
  if (!state.attendance.mine) {
    actions.append(createElement("small", "service-meta", "Marque presença primeiro para liberar o botão."));
  }
  return actions;
}

function appendServiceUpdates(card, service) {
  const updates = service.mechanicUpdates || [];
  if (!updates.length) return;
  const list = createElement("div", "service-updates");
  list.append(createElement("strong", "", "Fotos e observações"));
  updates.forEach((update) => {
    const item = createElement("div", "service-update-item");
    item.append(createElement("small", "", formatDateTime(update.createdAt)));
    if (update.observation) item.append(createElement("p", "", update.observation));
    if (update.photo) {
      item.append(createServicePhotoToggle(update.photo, "Ver foto adicionada"));
    }
    list.append(item);
  });
  card.append(list);
}

function createServiceUpdateForm(service) {
  const form = createElement("form", "service-update-form");
  form.dataset.serviceId = service.id;
  form.innerHTML = `
    <label class="field">
      <span>Observações do serviço</span>
      <textarea name="observation" rows="3" placeholder="Ex.: Cliente autorizou troca, peça aguardando, teste realizado..."></textarea>
    </label>
    <label class="field">
      <span>Adicionar foto</span>
      <input name="photo" type="file" accept="image/*" />
    </label>
    <div class="service-actions">
      <button class="button button-secondary" type="submit">Salvar observação/foto</button>
    </div>
  `;
  form.addEventListener("submit", (event) => submitServiceUpdate(event, service.id));
  return form;
}

function renderEmployeeServices(options = {}) {
  if (!elements.employeeServicesList) return;
  if (!options.forceEmployee && hasServiceFormInProgress()) return;
  const services = state.services.mine || [];
  if (!services.length) {
    elements.employeeServicesList.replaceChildren(
      createElement("p", "tool-card-subtitle", "Nenhum serviço enviado para você agora."),
    );
    return;
  }
  elements.employeeServicesList.replaceChildren(
    ...services.map((service) =>
      service.status === "pending" ? createPendingServiceCard(service) : createRunningServiceCard(service),
    ),
  );
}

function createServiceHistoryCard(service) {
  const card = createServiceSummary(service);
  card.classList.add("service-history-card");
  if (service.dashboardPhoto) {
    card.append(createServicePhotoToggle(service.dashboardPhoto, `Ver foto do painel ${service.plate || ""}`.trim()));
  }
  appendServiceUpdates(card, service);
  if (service.rejectionReason) {
    card.append(createElement("p", "service-history-note", `Motivo da rejeição: ${service.rejectionReason}`));
  }
  const closedAt = service.finishedAt || service.rejectedAt;
  if (closedAt) {
    card.append(createElement("small", "service-meta", `Registrado em ${formatDateTime(closedAt)}`));
  }
  return card;
}

function renderServiceHistory() {
  if (!elements.serviceHistoryList) return;
  const history = state.services.history || [];
  if (!history.length) {
    elements.serviceHistoryList.replaceChildren(
      createElement("p", "tool-card-subtitle", "Nenhum serviço finalizado ou rejeitado ainda."),
    );
    return;
  }
  elements.serviceHistoryList.replaceChildren(...history.map(createServiceHistoryCard));
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
  const role = state.user?.role || "employee";
  elements.profileSectionTitle.textContent = role === "manager" ? "Dados do gestor" : "Meus dados";
  elements.profileSectionSubtitle.textContent = role === "manager"
    ? "Informações vinculadas à oficina cadastrada pelo dono do site."
    : "Estas informações ficam vinculadas ao seu cadastro.";

  elements.profileViewName.textContent = state.profile.name || state.user?.name || "Nome não informado";
  elements.profileViewShop.textContent = state.profile.shop || state.user?.organizationName || "Oficina não informada";
  elements.profileViewSpecialty.textContent = state.profile.specialty || "Não informada";
  elements.profileViewPhone.textContent = state.profile.phone || "Não informado";
  elements.profileViewEmail.textContent = state.user?.email || "Não informado";
  const location = state.user?.organizationLocation || {};
  elements.workshopLocationField.hidden = role !== "manager";
  elements.workshopLatitude.value = Number.isFinite(Number(location.latitude)) ? location.latitude : "";
  elements.workshopLongitude.value = Number.isFinite(Number(location.longitude)) ? location.longitude : "";
  elements.workshopLocationText.textContent = locationText(location);

  elements.profileName.value = state.profile.name || "";
  elements.profileSpecialty.value = state.profile.specialty || "";
  elements.profilePhone.value = state.profile.phone || "";
  elements.profileShop.value = state.profile.shop || "";
  setProfileEditMode(state.profileEditing);
}

function setProfileEditMode(editing) {
  state.profileEditing = editing;
  elements.profileView.hidden = editing;
  elements.profileForm.hidden = !editing;
}

async function useWorkshopCurrentLocation() {
  try {
    elements.useWorkshopLocationButton.disabled = true;
    elements.workshopLocationText.textContent = "Obtendo localização...";
    const position = await getCurrentPosition();
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      radiusMeters: 150,
    };
    elements.workshopLatitude.value = String(location.latitude);
    elements.workshopLongitude.value = String(location.longitude);
    elements.workshopLocationText.textContent = locationText(location);
    showToast("Localização da oficina capturada. Salve os dados para confirmar.");
  } catch (error) {
    elements.workshopLocationText.textContent = locationText({
      latitude: elements.workshopLatitude.value,
      longitude: elements.workshopLongitude.value,
    });
    showToast(error.message || "Não foi possível obter a localização.");
  } finally {
    elements.useWorkshopLocationButton.disabled = false;
  }
}

async function submitProfile(event) {
  event.preventDefault();
  const profile = {
    name: elements.profileName.value.trim(),
    specialty: elements.profileSpecialty.value.trim(),
    phone: elements.profilePhone.value.trim(),
    shop: elements.profileShop.value.trim(),
    workshopLatitude: elements.workshopLatitude.value,
    workshopLongitude: elements.workshopLongitude.value,
  };
  try {
    const { user } = await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    state.profile = user.profile;
    showAuthenticated(user);
    setProfileEditMode(false);
    renderProfile();
    renderStats();
    elements.profileSavedMessage.textContent = "Dados salvos com sucesso.";
    showToast("Dados salvos com sucesso.");
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
    queue: [],
    notice: elements.tvNotice.value.trim(),
    highlight: elements.tvHighlight.value.trim(),
    audioMuted: elements.tvAudioMuted.checked,
    queueSource: "attendance",
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
  if (sectionName === "team") updateTeamLayout();
  const titles = {
    home: "Início",
    inventory: "Inventário",
    profile: "Meus dados",
    tv: "Painel TV",
    team: state.user?.role === "owner"
      ? state.teamMode === "create" ? "Cadastrar gestor" : "Clientes/Oficinas"
      : "Equipe/Fila",
    attendance: "Início",
    serviceHistory: "Histórico",
  };
  elements.homeSection.classList.toggle("active", sectionName === "home");
  elements.inventorySection.classList.toggle("active", sectionName === "inventory");
  elements.profileSection.classList.toggle("active", sectionName === "profile");
  elements.tvSection.classList.toggle("active", sectionName === "tv");
  elements.teamSection.classList.toggle("active", sectionName === "team");
  elements.attendanceSection.classList.toggle("active", sectionName === "attendance");
  elements.serviceHistorySection.classList.toggle("active", sectionName === "serviceHistory");
  elements.pageTitle.textContent = titles[sectionName] || "Inventário";
  document.querySelectorAll(".nav-item").forEach((button) => {
    const isActiveTeamMode = sectionName === "team" && button.dataset.section === "team"
      ? (button.dataset.teamMode || "list") === state.teamMode
      : button.dataset.section === sectionName;
    button.classList.toggle("active", isActiveTeamMode);
  });
  const showInventoryActions = state.user?.role === "manager" && sectionName === "inventory";
  document.querySelector("#addToolButton").hidden = !showInventoryActions;
  document.querySelector("#reportButton").hidden = !showInventoryActions;
  elements.sidebar.classList.remove("open");
}

async function submitTeam(event) {
  event.preventDefault();
  try {
    if (state.user.role === "owner" && state.teamMode === "create") {
      await createRegistrationInvite();
      return;
    }
    const isOwner = state.user.role === "owner";
    if (isOwner && !elements.organizationName.value.trim()) {
      showToast("Informe o nome fantasia da oficina.");
      return;
    }
    if (isOwner && !elements.organizationLegalName.value.trim()) {
      showToast("Informe a razão social da oficina.");
      return;
    }
    if (isOwner && onlyDigits(elements.organizationCnpj.value).length !== 14) {
      showToast("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    if (isOwner && !elements.organizationPhone.value.trim() && !elements.organizationEmail.value.trim()) {
      showToast("Informe telefone ou e-mail comercial da oficina.");
      return;
    }
    if (isOwner && (!elements.organizationAddress.value.trim() || !elements.organizationCity.value.trim() || !elements.organizationState.value.trim())) {
      showToast("Informe endereço, cidade e UF da oficina.");
      return;
    }
    if (isOwner && !elements.organizationTermsAccepted.checked) {
      showToast("Aceite os termos de uso para cadastrar a oficina.");
      return;
    }
    const logoFile = isOwner ? elements.organizationLogo.files[0] : null;
    const body = {
      name: elements.teamName.value.trim(),
      email: elements.teamEmail.value.trim(),
      password: elements.teamPassword.value,
      organizationName: elements.organizationName.value.trim(),
      organizationLegalName: elements.organizationLegalName.value.trim(),
      organizationCnpj: onlyDigits(elements.organizationCnpj.value),
      organizationPhone: elements.organizationPhone.value.trim(),
      organizationEmail: elements.organizationEmail.value.trim(),
      organizationAddress: elements.organizationAddress.value.trim(),
      organizationCity: elements.organizationCity.value.trim(),
      organizationState: elements.organizationState.value.trim().toLocaleUpperCase("pt-BR"),
      organizationTermsAccepted: elements.organizationTermsAccepted.checked,
      plan: elements.subscriptionPlan.value,
    };
    if (logoFile) body.organizationLogo = await compressImage(logoFile);
    const { user } = await api("/api/team", {
      method: "POST",
      body: JSON.stringify(body),
    });
    state.team.push(user);
    elements.teamForm.reset();
    if (state.user.role === "owner") {
      state.teamMode = "list";
      showSection("team");
    } else {
      setTeamFormCollapsed(true);
    }
    renderTeam();
    elements.teamSavedMessage.textContent =
      state.user.role === "owner" ? "Gestor cadastrado." : "Colaborador cadastrado.";
    setTimeout(() => (elements.teamSavedMessage.textContent = ""), 2600);
  } catch (error) {
    showToast(error.message);
  }
}

async function createRegistrationInvite() {
  const data = await api("/api/registration-invites", { method: "POST", body: JSON.stringify({}) });
  const link = data.link || `${window.location.origin}/cadastro/${data.invite.token}`;
  elements.generatedInviteLink.value = link;
  elements.inviteLinkBox.hidden = false;
  elements.teamSavedMessage.textContent = "Link gerado. Envie para o cliente preencher o cadastro.";
  setTimeout(() => (elements.teamSavedMessage.textContent = ""), 3600);
}

async function copyInviteLink() {
  const value = elements.generatedInviteLink.value;
  if (!value) return;
  await navigator.clipboard?.writeText(value);
  showToast("Link copiado.");
}

async function submitInviteRegistration(event) {
  event.preventDefault();
  elements.inviteRegisterError.textContent = "";
  try {
    if (!state.inviteToken) throw new Error("Link de cadastro inválido.");
    if (onlyDigits(elements.inviteOrganizationCnpj.value).length !== 14) {
      throw new Error("Informe um CNPJ válido com 14 dígitos.");
    }
    if (!elements.inviteOrganizationPhone.value.trim() && !elements.inviteOrganizationEmail.value.trim()) {
      throw new Error("Informe telefone ou e-mail comercial da oficina.");
    }
    if (!elements.inviteTermsAccepted.checked) {
      throw new Error("Aceite os termos de uso para enviar o cadastro.");
    }
    const logoFile = elements.inviteOrganizationLogo.files[0];
    const body = {
      managerName: elements.inviteManagerName.value.trim(),
      managerEmail: elements.inviteManagerEmail.value.trim(),
      managerPassword: elements.inviteManagerPassword.value,
      organizationName: elements.inviteOrganizationName.value.trim(),
      organizationLegalName: elements.inviteOrganizationLegalName.value.trim(),
      organizationCnpj: onlyDigits(elements.inviteOrganizationCnpj.value),
      organizationPhone: elements.inviteOrganizationPhone.value.trim(),
      organizationEmail: elements.inviteOrganizationEmail.value.trim(),
      organizationAddress: elements.inviteOrganizationAddress.value.trim(),
      organizationCity: elements.inviteOrganizationCity.value.trim(),
      organizationState: elements.inviteOrganizationState.value.trim().toLocaleUpperCase("pt-BR"),
      organizationTermsAccepted: elements.inviteTermsAccepted.checked,
    };
    if (logoFile) body.organizationLogo = await compressImage(logoFile);
    await api(`/api/registration-invites/${encodeURIComponent(state.inviteToken)}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    elements.inviteRegisterForm.reset();
    elements.inviteRegisterForm.replaceChildren(
      createElement("div", "", ""),
      createElement("h2", "", "Cadastro enviado"),
      createElement("p", "", "Recebemos os dados da oficina. Aguarde a liberação final do responsável pela plataforma."),
    );
  } catch (error) {
    elements.inviteRegisterError.textContent = error.message;
  }
}

async function approveRegistrationInvite(inviteId, action) {
  try {
    const data = await api(`/api/registration-invites/${inviteId}/approve`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    state.team = data.users || state.team;
    state.registrationInvites = data.invites || state.registrationInvites;
    renderTeam();
    showToast(action === "reject" ? "Cadastro rejeitado." : "Cadastro liberado.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateOrganizationSubscription(organizationId, action) {
  try {
    const data = await api(`/api/organizations/${organizationId}/subscription`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    state.team = data.users || state.team;
    renderTeam();
    showToast(
      action === "block"
        ? "Oficina bloqueada."
        : action === "renew"
          ? "Plano renovado."
          : "Oficina liberada.",
    );
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshServices() {
  if (!state.user?.organizationId) return;
  try {
    const previousPending = new Set((state.services.mine || []).filter((service) => service.status === "pending").map((service) => service.id));
    const services = await api("/api/services");
    const preserveEmployeeForm = state.user.role === "employee" && hasServiceFormInProgress();
    setServicesFromPayload({
      ...services,
      mine: preserveEmployeeForm ? state.services.mine : services.mine || [],
    });
    renderServices();
    const hasNewPending = !preserveEmployeeForm && state.user.role === "employee" && (state.services.mine || []).some(
      (service) => service.status === "pending" && !previousPending.has(service.id),
    );
    if (hasNewPending) showToast("Novo serviço recebido.");
  } catch {
    stopServicesPolling();
  }
}

function startServicesPolling() {
  stopServicesPolling();
  if (!state.user || state.user.role === "owner") return;
  state.servicesPollTimer = window.setInterval(refreshServices, 15000);
}

function stopServicesPolling() {
  if (state.servicesPollTimer) {
    window.clearInterval(state.servicesPollTimer);
    state.servicesPollTimer = null;
  }
}

async function submitDispatchService(event) {
  event.preventDefault();
  try {
    const services = await api("/api/services", {
      method: "POST",
      body: JSON.stringify({
        mechanicId: elements.dispatchMechanic.value,
        title: elements.dispatchTitle.value.trim(),
        notes: elements.dispatchNotes.value.trim(),
      }),
    });
    setServicesFromPayload(services);
    elements.dispatchServiceForm.reset();
    renderServices();
    showToast("Serviço enviado para o mecânico.");
  } catch (error) {
    showToast(error.message);
  }
}

async function checkIn() {
  try {
    showToast("Verificando localização...");
    const position = await getCurrentPosition();
    state.attendance = await api("/api/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    });
    renderAttendance();
    await refreshServices();
    showToast("Presença marcada. Você entrou na fila.");
  } catch (error) {
    showToast(error.message || "Não foi possível verificar sua localização.");
  }
}

async function checkOut() {
  try {
    state.attendance = await api("/api/attendance/check-out", { method: "POST" });
    renderAttendance();
    await refreshServices();
    showToast("Expediente encerrado. Serviços ativos foram pausados.");
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

async function acceptService(event, serviceId) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === "true") return;
  const file = form.elements.dashboardPhoto.files[0];
  if (!file) {
    showToast("Envie a foto do painel em funcionamento.");
    return;
  }
  form.dataset.submitting = "true";
  form.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    const dashboardPhoto = await compressImage(file);
    const services = await api(`/api/services/${serviceId}/accept`, {
      method: "POST",
      body: JSON.stringify({
        plate: form.elements.plate.value.trim(),
        mileage: form.elements.mileage.value.trim(),
        dashboardPhoto,
      }),
    });
    setServicesFromPayload(services);
    state.attendance = await api("/api/attendance");
    renderAttendance();
    renderServices({ forceEmployee: true });
    showToast("Serviço aceito.");
  } catch (error) {
    form.dataset.submitting = "";
    form.querySelectorAll("button").forEach((button) => (button.disabled = false));
    showToast(error.message);
  }
}

async function rejectService(form, serviceId) {
  if (form.dataset.submitting === "true") return;
  const rejectionReason = form.elements.rejectionReason.value.trim();
  if (rejectionReason.length < 3) {
    showToast("Descreva o motivo da rejeição.");
    form.elements.rejectionReason.focus();
    return;
  }
  form.dataset.submitting = "true";
  form.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    const services = await api(`/api/services/${serviceId}/reject`, {
      method: "POST",
      body: JSON.stringify({ rejectionReason }),
    });
    setServicesFromPayload(services);
    state.attendance = await api("/api/attendance");
    renderAttendance();
    renderServices({ forceEmployee: true });
    showToast("Serviço rejeitado. Você voltou para o fim da fila.");
  } catch (error) {
    form.dataset.submitting = "";
    form.querySelectorAll("button").forEach((button) => (button.disabled = false));
    showToast(error.message);
  }
}

async function finishService(serviceId) {
  try {
    const services = await api(`/api/services/${serviceId}/finish`, { method: "POST" });
    setServicesFromPayload(services);
    state.attendance = await api("/api/attendance");
    renderAttendance();
    renderServices({ forceEmployee: true });
    showToast("Serviço finalizado. Você voltou para a fila.");
  } catch (error) {
    showToast(error.message);
  }
}

async function pauseServiceForApproval(serviceId) {
  try {
    const services = await api(`/api/services/${serviceId}/pause-approval`, { method: "POST" });
    setServicesFromPayload(services);
    state.attendance = await api("/api/attendance");
    renderAttendance();
    renderServices({ forceEmployee: true });
    showToast("Serviço pausado para aprovação. Você voltou para o fim da fila.");
  } catch (error) {
    showToast(error.message);
  }
}

async function submitServiceUpdate(event, serviceId) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === "true") return;
  const file = form.elements.photo.files[0];
  const observation = form.elements.observation.value.trim();
  if (!file && !observation) {
    showToast("Adicione uma observação ou uma foto.");
    return;
  }
  form.dataset.submitting = "true";
  form.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    const photo = file ? await compressImage(file) : "";
    const services = await api(`/api/services/${serviceId}/update`, {
      method: "POST",
      body: JSON.stringify({ observation, photo }),
    });
    setServicesFromPayload(services);
    renderServices({ forceEmployee: true });
    showToast("Atualização salva no serviço.");
  } catch (error) {
    form.dataset.submitting = "";
    form.querySelectorAll("button").forEach((button) => (button.disabled = false));
    showToast(error.message);
  }
}

async function resumeService(serviceId) {
  try {
    const services = await api(`/api/services/${serviceId}/resume`, { method: "POST" });
    setServicesFromPayload(services);
    state.attendance = await api("/api/attendance");
    renderAttendance();
    renderServices({ forceEmployee: true });
    showToast("Serviço retomado.");
  } catch (error) {
    showToast(error.message);
  }
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
  button.addEventListener("click", () => {
    if (button.dataset.section === "team" && button.dataset.teamMode) {
      state.teamMode = button.dataset.teamMode;
    }
    showSection(button.dataset.section);
  });
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
elements.teamFormToggleButton.addEventListener("click", toggleTeamForm);
elements.dispatchServiceForm.addEventListener("submit", submitDispatchService);
elements.plateSearchInput.addEventListener("input", renderPlateSearchResults);
elements.profileEditButton.addEventListener("click", () => setProfileEditMode(true));
elements.useWorkshopLocationButton.addEventListener("click", useWorkshopCurrentLocation);
elements.loginForm.addEventListener("submit", submitLogin);
elements.inviteRegisterForm.addEventListener("submit", submitInviteRegistration);
elements.copyInviteLinkButton.addEventListener("click", copyInviteLink);
elements.logoutButton.addEventListener("click", logout);
elements.installButton.addEventListener("click", installApp);
elements.enableNotificationsButton.addEventListener("click", enablePushNotifications);
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
