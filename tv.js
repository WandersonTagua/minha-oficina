const tvState = {
  settings: null,
  playlistIndex: 0,
  mediaTimer: null,
};

const tvElements = {
  mediaStage: document.querySelector("#mediaStage"),
  mediaEmpty: document.querySelector("#mediaEmpty"),
  currentMechanic: document.querySelector("#currentMechanic"),
  queueList: document.querySelector("#queueList"),
  queueEmpty: document.querySelector("#queueEmpty"),
  noticeText: document.querySelector("#noticeText"),
  highlightCard: document.querySelector("#highlightCard"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
};

function toDisplayName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s|[-'])\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function getYoutubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
    const parts = parsed.pathname.split("/").filter(Boolean);
    const markers = ["embed", "shorts", "live"];
    const marker = parts.findIndex((part) => markers.includes(part));
    if (marker >= 0) return parts[marker + 1];
  } catch {
    return "";
  }
  return "";
}

function youtubeEmbedUrl(url, muted = true) {
  const id = getYoutubeId(url);
  if (!id) return "";
  const muteValue = muted ? 1 : 0;
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muteValue}&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${id}`;
}

function renderText(settings) {
  tvElements.currentMechanic.textContent = toDisplayName(settings.mechanic) || "Aguardando fila";
  tvElements.noticeText.textContent = settings.notice || "Bem-vindo à Minha Oficina.";
  tvElements.highlightCard.textContent = settings.highlight || "Painel da oficina em operação";
  tvElements.queueList.replaceChildren();

  const queue = Array.isArray(settings.queue) ? settings.queue.filter(Boolean) : [];
  queue.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = toDisplayName(name);
    tvElements.queueList.append(item);
  });
  tvElements.queueEmpty.style.display = queue.length ? "none" : "block";
}

function showEmptyMedia() {
  tvElements.mediaStage.replaceChildren(tvElements.fullscreenButton, tvElements.mediaEmpty);
}

function renderCurrentMedia() {
  clearTimeout(tvState.mediaTimer);
  const playlist = tvState.settings?.playlist || [];
  if (!playlist.length) {
    showEmptyMedia();
    return;
  }

  const item = playlist[tvState.playlistIndex % playlist.length];
  tvElements.mediaStage.replaceChildren(tvElements.fullscreenButton);

  if (item.type === "youtube") {
    const src = youtubeEmbedUrl(item.url, tvState.settings?.audioMuted !== false);
    if (!src) {
      advanceMedia(1000);
      return;
    }
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.title = item.title || "Vídeo do YouTube";
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    tvElements.mediaStage.append(frame);
    advanceMedia(45_000);
    return;
  }

  const video = document.createElement("video");
  video.src = item.url;
  video.autoplay = true;
  video.muted = tvState.settings?.audioMuted !== false;
  video.playsInline = true;
  video.controls = false;
  video.addEventListener("ended", () => advanceMedia(200));
  video.addEventListener("error", () => advanceMedia(1000));
  tvElements.mediaStage.append(video);
  video.play().catch(() => advanceMedia(8000));
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  document.documentElement.requestFullscreen?.();
}

function advanceMedia(delay) {
  clearTimeout(tvState.mediaTimer);
  tvState.mediaTimer = setTimeout(() => {
    const playlist = tvState.settings?.playlist || [];
    if (!playlist.length) {
      showEmptyMedia();
      return;
    }
    tvState.playlistIndex = (tvState.playlistIndex + 1) % playlist.length;
    renderCurrentMedia();
  }, delay);
}

async function loadTvSettings() {
  try {
    const response = await fetch(`/api/tv${window.location.search}`, { cache: "no-store" });
    const { tv } = await response.json();
    const previousPlaylist = JSON.stringify(tvState.settings?.playlist || []);
    const nextPlaylist = JSON.stringify(tv.playlist || []);
    tvState.settings = tv;
    renderText(tv);
    if (previousPlaylist !== nextPlaylist) {
      tvState.playlistIndex = 0;
      renderCurrentMedia();
    }
  } catch {
    tvElements.noticeText.textContent = "Não foi possível carregar o painel.";
  }
}

loadTvSettings();
setInterval(loadTvSettings, 10_000);
tvElements.fullscreenButton.addEventListener("click", toggleFullscreen);
