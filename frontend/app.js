const API_URL = window.GD_API_URL || "";
const root = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");

const iconPaths = {
  add: '<path d="M12 5v14M5 12h14"/>',
  arrowDown: '<path d="M12 4v11m-5-4 5 5 5-5M5 20h14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  open: '<path d="M14 3h7v7m0-7L10 14"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 15h2a1.5 1.5 0 0 0 0-3H8v6m6 0v-6h1a3 3 0 0 1 0 6zm-1-3h2"/>',
  restore: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2z"/>',
  share: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  sort: '<path d="m3 7 3-3 3 3M6 4v16m5-12h9m-9 5h6m-6 5h3"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M20 16.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-3"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8m-5-4v4"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
};

function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.document}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

const state = {
  token: sessionStorage.getItem("gd-session"),
  user: null,
  view: "drive",
  query: "",
  folderStack: [],
  files: [],
  storage: { used: 0, total: 15 * 1024 * 1024 * 1024 },
  selected: null,
  layout: "list",
  modal: null,
  menu: null,
  authMode: "login",
  loading: false,
};

function notify(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast${error ? " error" : ""}`;
  toast.textContent = message;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 3600);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "omit",
    });
  } catch {
    throw new Error("Could not reach Drive. Check your connection and try again.");
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    if (response.status === 401 && state.token) {
      state.token = null;
      state.user = null;
      sessionStorage.removeItem("gd-session");
      render();
    }
    throw new Error(body?.error || "Something went wrong. Please try again.");
  }
  return body;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function fileKind(file) {
  if (file.isFolder) return "folder";
  const extension = file.name.split(".").pop().toLowerCase();
  if (file.mimeType === "application/pdf" || extension === "pdf") return "pdf";
  if (file.mimeType.startsWith("image/")) return "image";
  if (file.mimeType.startsWith("video/")) return "video";
  if (file.mimeType.includes("spreadsheet") || ["xls", "xlsx", "csv"].includes(extension)) return "sheet";
  if (file.mimeType.includes("document") || ["doc", "docx", "txt", "md"].includes(extension)) return "document";
  if (["zip", "rar", "7z", "gz"].includes(extension)) return "archive";
  return "document";
}

function fileIcon(file) {
  const kind = fileKind(file);
  const glyph = kind === "folder" ? "folder"
    : kind === "pdf" ? "pdf"
      : kind === "image" ? "image"
        : kind === "sheet" ? "sheet"
          : kind === "video" ? "video"
            : "document";
  return `<span class="file-icon ${kind}">${icon(glyph, 21)}</span>`;
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function currentTitle() {
  if (state.query) return "Search results";
  if (state.view === "recent") return "Recent";
  if (state.view === "starred") return "Starred";
  if (state.view === "trash") return "Trash";
  return state.folderStack.at(-1)?.name || "My Drive";
}

function navigation() {
  const items = [
    ["drive", "folder", "My Drive"],
    ["recent", "clock", "Recent"],
    ["starred", "star", "Starred"],
    ["trash", "trash", "Trash"],
  ];
  return `<nav class="nav-list" aria-label="Drive navigation">${items.map(([view, glyph, label]) => `
    <button class="nav-item ${state.view === view && !state.query ? "active" : ""}" data-view="${view}">
      ${icon(glyph, 19)}<span>${label}</span>
    </button>`).join("")}</nav>`;
}

function authScreen() {
  const signup = state.authMode === "signup";
  return `<section class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo"><span class="drive-mark" aria-hidden="true"><i></i><b></b><em></em></span><span>Drive</span></div>
      <h1>${signup ? "Create your account" : "Welcome to Drive"}</h1>
      <p class="auth-subtitle">${signup ? "Set up your space and keep your files together." : "Sign in to pick up right where you left off."}</p>
      <form class="auth-form" data-form="auth">
        ${signup ? `<label class="auth-field">Your name<input name="name" autocomplete="name" maxlength="80" required placeholder="e.g. Alex Morgan" /></label>` : ""}
        <label class="auth-field">Email address<input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com" /></label>
        <label class="auth-field">Password<input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="10" maxlength="128" required placeholder="${signup ? "At least 10 characters" : "Enter your password"}" /></label>
        <button class="modal-submit" type="submit">${signup ? "Create account" : "Sign in"}</button>
      </form>
      <p class="auth-footnote">Your files are private to your account. Passwords are securely hashed before they are stored.</p>
      <div class="auth-switch">${signup ? "Already have an account?" : "New to Drive?"}
        <button class="text-button" data-action="toggle-auth">${signup ? "Sign in" : "Create an account"}</button>
      </div>
    </div>
  </section>`;
}

function breadcrumbMarkup() {
  const stack = state.folderStack;
  if (state.query || state.view !== "drive" || !stack.length) return "";
  const ancestors = stack.slice(0, -1);
  return `<button class="crumb" data-action="breadcrumb" data-index="-1">My Drive</button>${ancestors.map((folder, index) => `
    <span class="crumb-separator">${icon("chevron", 15)}</span>
    <button class="crumb" data-action="breadcrumb" data-index="${index}">${escapeHtml(folder.name)}</button>`).join("")}`;
}

function quickAccess() {
  if (state.view !== "drive" || state.query || state.folderStack.length) return "";
  const quickFiles = state.files.filter((file) => !file.isFolder && !file.isTrashed).slice(0, 4);
  if (!quickFiles.length) return "";
  return `<section aria-labelledby="quick-title">
    <h2 class="section-title" id="quick-title">${icon("clock", 17)} Quick access</h2>
    <div class="quick-grid">${quickFiles.map((file) => `
      <button class="quick-card" data-action="open-file" data-id="${escapeHtml(file.id)}" title="${escapeHtml(file.name)}">
        ${fileIcon(file)}<span class="quick-card-name">${escapeHtml(file.name)}</span>
      </button>`).join("")}</div>
  </section>`;
}

function emptyMessage() {
  if (state.query) return ["No files found", "Try another search, or check the spelling."];
  if (state.view === "trash") return ["Trash is empty", "Items you move to the trash will appear here."];
  if (state.view === "starred") return ["Nothing starred yet", "Star files you use often to find them here."];
  if (state.view === "recent") return ["Nothing here yet", "Files you open or update will show up here."];
  return ["Your drive is ready", "Upload a file or create a folder to get started."];
}

function fileRows() {
  if (!state.files.length) {
    const [title, description] = emptyMessage();
    return `<div class="empty-state">
      <div class="empty-illustration">${icon(state.view === "trash" ? "trash" : "folder", 34)}</div>
      <h2>${title}</h2><p>${description}</p>
      ${state.view === "drive" && !state.query ? `<button data-action="upload">Upload a file</button>` : ""}
    </div>`;
  }

  const files = [...state.files];
  if (state.view === "recent" || state.query) {
    files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  if (state.layout === "grid") {
    return `<div class="quick-grid file-grid">${files.map((file) => `
      <button class="quick-card ${state.selected === file.id ? "selected" : ""}" data-action="select-file" data-id="${escapeHtml(file.id)}" data-folder="${file.isFolder}" title="${escapeHtml(file.name)}">
        ${fileIcon(file)}<span class="quick-card-name">${escapeHtml(file.name)}</span>
      </button>`).join("")}</div>`;
  }

  return `<div class="table-wrap"><table class="file-table">
    <thead><tr><th>Name</th><th>Owner</th><th>Last modified</th><th>File size</th><th></th></tr></thead>
    <tbody>${files.map((file) => `
      <tr class="file-row ${state.selected === file.id ? "selected" : ""}" data-action="select-file" data-id="${escapeHtml(file.id)}" data-folder="${file.isFolder}">
        <td><div class="file-name-cell">${fileIcon(file)}<span class="file-name-text">${escapeHtml(file.name)}</span>${file.isStarred ? `<span class="star-indicator">${icon("star", 14)}</span>` : ""}</div></td>
        <td><span class="file-owner"><span class="mini-avatar">${escapeHtml(initials(state.user.name))}</span><span class="file-meta">me</span></span></td>
        <td class="file-meta">${formatDate(file.updatedAt)}</td>
        <td class="file-meta">${file.isFolder ? "—" : formatBytes(file.size)}</td>
        <td><button class="row-menu-button" data-action="file-menu" data-id="${escapeHtml(file.id)}" aria-label="More actions for ${escapeHtml(file.name)}">${icon("more", 18)}</button></td>
      </tr>`).join("")}</tbody>
  </table></div>`;
}

function selectionToolbar() {
  if (!state.selected) return "";
  const item = state.files.find((file) => file.id === state.selected);
  if (!item) return "";
  return `<div class="selection-toolbar">
    <button class="icon-button" data-action="clear-selection" aria-label="Clear selection">${icon("close", 18)}</button>
    <span class="selection-count">1 selected</span><span class="selection-spacer"></span>
    ${state.view === "trash"
      ? `<button class="icon-button" data-action="restore" data-id="${escapeHtml(item.id)}" aria-label="Restore">${icon("restore", 18)}</button>
         <button class="icon-button" data-action="permanent-delete" data-id="${escapeHtml(item.id)}" aria-label="Delete forever">${icon("trash", 18)}</button>`
      : `<button class="icon-button" data-action="download" data-id="${escapeHtml(item.id)}" aria-label="Download">${icon("download", 18)}</button>
         <button class="icon-button" data-action="open" data-id="${escapeHtml(item.id)}" aria-label="Open">${icon("open", 18)}</button>
         <button class="icon-button" data-action="star" data-id="${escapeHtml(item.id)}" aria-label="${item.isStarred ? "Remove star" : "Add star"}">${icon("star", 18)}</button>
         <button class="icon-button" data-action="rename" data-id="${escapeHtml(item.id)}" aria-label="Rename">${icon("document", 18)}</button>
         <button class="icon-button" data-action="trash" data-id="${escapeHtml(item.id)}" aria-label="Move to trash">${icon("trash", 18)}</button>`}
  </div>`;
}

function storageMarkup() {
  const usedPercent = Math.min(100, (state.storage.used / state.storage.total) * 100);
  const usageLevel = Math.min(100, Math.ceil(usedPercent / 10) * 10);
  return `<div class="sidebar-storage">
    <div class="storage-caption">${icon("folder", 15)} Storage</div>
    <div class="storage-line"><div class="storage-fill level-${usageLevel}"></div></div>
    <div class="storage-caption">${formatBytes(state.storage.used)} of 15 GB used</div>
    <button class="storage-manage" data-action="storage-info">Manage storage</button>
  </div>`;
}

function menuMarkup() {
  if (!state.menu) return "";
  if (state.menu.type === "new") {
    return `<div class="menu new-menu" data-menu>
      <button class="menu-item" data-action="create-folder">${icon("folder", 17)}New folder</button>
      <div class="menu-divider"></div>
      <button class="menu-item" data-action="upload">${icon("upload", 17)}Upload files</button>
    </div>`;
  }
  const file = state.files.find((item) => item.id === state.menu.id);
  if (!file) return "";
  const options = state.view === "trash"
    ? [["restore", "restore", "Restore"], ["permanent-delete", "trash", "Delete forever"]]
    : [
      ...(file.isFolder ? [] : [["open", "open", "Open"], ["download", "download", "Download"]]),
      ["rename", "document", "Rename"],
      ["star", "star", file.isStarred ? "Remove from starred" : "Add to starred"],
      ["trash", "trash", "Move to trash"],
    ];
  return `<div class="menu file-action-menu" data-menu>
    ${options.map(([action, glyph, label]) => `<button class="menu-item" data-action="${action}" data-id="${escapeHtml(file.id)}">${icon(glyph, 17)}${label}</button>`).join("")}
  </div>`;
}

function modalMarkup() {
  if (!state.modal) return "";
  const { type, file } = state.modal;
  if (type === "preview") {
    let preview;
    if (state.modal.mode === "image") {
      preview = `<img class="preview-image" src="${escapeHtml(state.modal.url)}" alt="${escapeHtml(file.name)}" />`;
    } else if (state.modal.mode === "pdf") {
      preview = `<iframe class="preview-frame" src="${escapeHtml(state.modal.url)}" title="Preview of ${escapeHtml(file.name)}" sandbox="allow-scripts"></iframe>`;
    } else if (state.modal.mode === "text") {
      preview = `<pre class="preview-text" id="preview-text"></pre>`;
    } else {
      preview = `<div class="preview-unavailable">${icon(fileKind(file), 38)}
        <h3>Preview isn't available</h3>
        <p>Download this file to open it in a compatible app.</p>
        <button class="modal-submit" data-action="download" data-id="${escapeHtml(file.id)}">${icon("download", 16)}Download</button>
      </div>`;
    }

    return `<div class="modal-backdrop" data-action="backdrop">
      <section class="modal preview-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        <div class="modal-header">
          <div class="preview-title">${fileIcon(file)}<h2 id="modal-heading">${escapeHtml(file.name)}</h2></div>
          <div class="preview-actions">
            <button class="icon-button" data-action="download" data-id="${escapeHtml(file.id)}" aria-label="Download">${icon("download", 19)}</button>
            <button class="icon-button" data-action="close-modal" aria-label="Close">${icon("close", 19)}</button>
          </div>
        </div>
        <div class="preview-content">${preview}</div>
      </section>
    </div>`;
  }

  const heading = type === "folder" ? "New folder" : "Rename";
  const value = type === "rename" ? file.name : "";
  return `<div class="modal-backdrop" data-action="backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
      <div class="modal-header"><h2 id="modal-heading">${heading}</h2><button class="icon-button" data-action="close-modal" aria-label="Close">${icon("close", 19)}</button></div>
      <p class="modal-copy">${type === "folder" ? "Give your new folder a name." : "Choose a new name for this item."}</p>
      <form data-form="modal">
        <label class="modal-label" for="modal-name">Name</label>
        <input id="modal-name" name="name" class="modal-input" maxlength="255" required value="${escapeHtml(value)}" autocomplete="off" />
        <button class="modal-submit" type="submit">${type === "folder" ? "Create" : "Save"}</button>
      </form>
    </section>
  </div>`;
}

function mainScreen() {
  const title = currentTitle();
  const usedPercent = Math.min(100, (state.storage.used / state.storage.total) * 100);
  return `<div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" data-action="home" aria-label="Drive home"><span class="drive-mark" aria-hidden="true"><i></i><b></b><em></em></span>Drive</a>
      <form class="search-wrap" data-form="search" role="search">
        ${icon("search", 21)}
        <input name="query" type="search" placeholder="Search in Drive" aria-label="Search in Drive" value="${escapeHtml(state.query)}" />
        <button class="search-submit" type="submit" aria-label="Search">${icon("search", 18)}</button>
      </form>
      <div class="topbar-spacer"></div>
      <div class="topbar-actions">
        <button class="icon-button" data-action="help" aria-label="Help">${icon("settings", 19)}</button>
        <button class="avatar" data-action="account" title="${escapeHtml(state.user.email)}">${escapeHtml(initials(state.user.name))}</button>
      </div>
    </header>
    <aside class="sidebar">
      <button class="new-button" data-action="new-menu">${icon("add", 22)}<span>New</span></button>
      ${navigation()}
      <div class="sidebar-divider"></div>
      ${storageMarkup()}
    </aside>
    <main class="main"><div class="main-inner">
      <div class="breadcrumbs">${breadcrumbMarkup()}</div>
      <div class="main-heading">
        <h1>${escapeHtml(title)}</h1>
        <div class="heading-actions">
          ${state.view === "drive" && !state.query ? `<div class="view-toggle" aria-label="View layout">
            <button class="${state.layout === "list" ? "active" : ""}" data-action="layout" data-layout="list" aria-label="List view">${icon("list", 18)}</button>
            <button class="${state.layout === "grid" ? "active" : ""}" data-action="layout" data-layout="grid" aria-label="Grid view">${icon("grid", 18)}</button>
          </div>` : ""}
          ${state.view === "drive" && !state.query ? `<button class="icon-button" data-action="new-menu" aria-label="Create or upload">${icon("add", 20)}</button>` : ""}
        </div>
      </div>
      ${state.loading ? `<div class="empty-state"><div class="empty-illustration">${icon("clock", 32)}</div><h2>Loading your files…</h2></div>` : ""}
      ${selectionToolbar()}
      ${!state.loading ? quickAccess() : ""}
      ${!state.loading ? `<section aria-labelledby="files-title">
        <div class="file-section-heading"><h2 class="section-title" id="files-title">${state.view === "trash" ? "Items in trash" : state.query ? "Results" : "Files"}</h2>
          ${state.files.length ? `<button class="sort-button" data-action="sort">${icon("sort", 16)} Name</button>` : ""}
        </div>
        ${fileRows()}
      </section>` : ""}
    </div></main>
    ${state.menu ? menuMarkup() : ""}
    ${modalMarkup()}
    <input id="file-picker" class="hidden" type="file" multiple />
  </div>`;
}

function render() {
  root.innerHTML = state.token && state.user ? mainScreen() : authScreen();
}

async function loadFiles() {
  if (!state.user) return;
  state.loading = true;
  state.selected = null;
  render();
  const parameters = new URLSearchParams({ view: state.query ? "search" : state.view });
  if (state.query) parameters.set("q", state.query);
  if (!state.query && state.view === "drive" && state.folderStack.length) {
    parameters.set("parent", state.folderStack.at(-1).id);
  }
  try {
    const result = await api(`/api/files?${parameters}`);
    state.files = result.files;
    state.storage = result.storage;
  } catch (error) {
    notify(error.message, true);
    state.files = [];
  } finally {
    state.loading = false;
    render();
  }
}

async function signIn(form) {
  const formData = new FormData(form);
  const signup = state.authMode === "signup";
  const result = await api(`/api/auth/${signup ? "signup" : "login"}`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    }),
  });
  state.token = result.token;
  state.user = result.user;
  sessionStorage.setItem("gd-session", result.token);
  state.view = "drive";
  state.query = "";
  state.folderStack = [];
  await loadFiles();
  notify(signup ? "Your Drive is ready." : `Welcome back, ${result.user.name.split(" ")[0]}.`);
}

async function fetchFileBlob(id) {
  const response = await fetch(`${API_URL}/api/files/${encodeURIComponent(id)}/download`, {
    headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
  });
  if (!response.ok) {
    let message = "Could not download that file.";
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  return response.blob();
}

async function downloadFile(id) {
  const file = state.files.find((item) => item.id === id);
  const blob = await fetchFileBlob(id);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = file?.name || "download";
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function openPreview(id) {
  const file = state.files.find((item) => item.id === id);
  if (!file || file.isFolder) return;

  const extension = file.name.split(".").pop().toLowerCase();
  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf" || extension === "pdf";
  const isText = file.mimeType.startsWith("text/") ||
    ["csv", "html", "htm", "json", "log", "md", "xml"].includes(extension);
  const mode = isImage ? "image" : isPdf ? "pdf" : isText && file.size <= 2 * 1024 * 1024 ? "text" : "unavailable";
  let url = null;
  let text = null;

  if (mode !== "unavailable") {
    const blob = await fetchFileBlob(id);
    if (mode === "text") {
      text = await blob.text();
    } else {
      url = URL.createObjectURL(blob);
    }
  }

  state.modal = { type: "preview", file, mode, url };
  render();
  if (mode === "text") {
    document.querySelector("#preview-text").textContent = text;
  }
}

function closeModal() {
  if (state.modal?.type === "preview" && state.modal.url) {
    URL.revokeObjectURL(state.modal.url);
  }
  state.modal = null;
  render();
}

async function performAction(action, id) {
  const file = state.files.find((item) => item.id === id);
  if (action === "download") {
    const hadMenu = Boolean(state.menu);
    state.menu = null;
    if (hadMenu) render();
    return downloadFile(id);
  }
  if (action === "open") {
    state.menu = null;
    return openPreview(id);
  }
  if (action === "rename") {
    state.modal = { type: "rename", file };
    state.menu = null;
    render();
    document.querySelector("#modal-name")?.focus();
    document.querySelector("#modal-name")?.select();
    return;
  }
  if (action === "star") {
    await api(`/api/files/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ isStarred: !file.isStarred }),
    });
    notify(file.isStarred ? "Removed from starred." : "Added to starred.");
  } else if (action === "trash") {
    await api(`/api/files/${encodeURIComponent(id)}`, { method: "DELETE" });
    notify("Moved to trash.");
  } else if (action === "restore") {
    await api(`/api/files/${encodeURIComponent(id)}/restore`, { method: "PATCH" });
    notify("Restored to Drive.");
  } else if (action === "permanent-delete") {
    if (!window.confirm(`Permanently delete "${file.name}"? This can't be undone.`)) return;
    await api(`/api/files/${encodeURIComponent(id)}?permanent=true`, { method: "DELETE" });
    notify("Deleted forever.");
  }
  state.menu = null;
  await loadFiles();
}

async function uploadFiles(files) {
  if (!files.length) return;
  state.loading = true;
  state.menu = null;
  render();
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    if (state.folderStack.length && state.view === "drive") {
      form.append("parentId", state.folderStack.at(-1).id);
    }
    try {
      await api("/api/files", { method: "POST", body: form });
      notify(`Uploaded ${file.name}`);
    } catch (error) {
      notify(`${file.name}: ${error.message}`, true);
    }
  }
  await loadFiles();
}

function openFolder(file) {
  state.folderStack.push({ id: file.id, name: file.name });
  state.view = "drive";
  state.query = "";
  loadFiles();
}

root.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const button = target.closest("[data-action], [data-view]");
  const action = button?.dataset.action;
  const id = button?.dataset.id;

  if (state.modal && action === "backdrop" && target === button) {
    closeModal();
    return;
  }
  if (state.menu && !button && !target.closest("[data-menu]")) {
    state.menu = null;
    render();
    return;
  }
  if (button && action !== "select-file") event.stopPropagation();

  try {
    if (action === "toggle-auth") {
      state.authMode = state.authMode === "login" ? "signup" : "login";
      render();
    } else if (action === "home") {
      event.preventDefault();
      state.folderStack = [];
      state.query = "";
      state.view = "drive";
      await loadFiles();
    } else if (button?.dataset.view) {
      state.view = button.dataset.view;
      state.folderStack = [];
      state.query = "";
      await loadFiles();
    } else if (action === "new-menu") {
      state.menu = state.menu?.type === "new" ? null : { type: "new" };
      render();
    } else if (action === "create-folder") {
      state.menu = null;
      state.modal = { type: "folder" };
      render();
      document.querySelector("#modal-name")?.focus();
    } else if (action === "upload") {
      state.menu = null;
      document.querySelector("#file-picker")?.click();
    } else if (action === "select-file") {
      const file = state.files.find((item) => item.id === button.dataset.id);
      if (!file) return;
      if (button.dataset.folder === "true" && file.isFolder) {
        openFolder(file);
      } else {
        state.selected = state.selected === file.id ? null : file.id;
        render();
      }
    } else if (action === "open-file") {
      const file = state.files.find((item) => item.id === id);
      if (file?.isFolder) openFolder(file);
      else if (file) await openPreview(file.id);
    } else if (action === "file-menu") {
      state.selected = id;
      state.menu = { id };
      render();
    } else if (["open", "download", "rename", "star", "trash", "restore", "permanent-delete"].includes(action)) {
      await performAction(action, id);
    } else if (action === "clear-selection") {
      state.selected = null;
      render();
    } else if (action === "layout") {
      state.layout = button.dataset.layout;
      render();
    } else if (action === "sort") {
      state.files.reverse();
      render();
    } else if (action === "breadcrumb") {
      const index = Number(button.dataset.index);
      state.folderStack = index < 0 ? [] : state.folderStack.slice(0, index + 1);
      await loadFiles();
    } else if (action === "clear-search") {
      state.query = "";
      await loadFiles();
    } else if (action === "close-modal") {
      closeModal();
    } else if (action === "account") {
      if (window.confirm(`Signed in as ${state.user.email}.\n\nSign out?`)) {
        state.token = null;
        state.user = null;
        state.files = [];
        sessionStorage.removeItem("gd-session");
        render();
      }
    } else if (action === "storage-info") {
      notify(`${formatBytes(state.storage.used)} of 15 GB used.`);
    } else if (action === "help") {
      notify("Upload, organize, search, star, and restore your files from Drive.");
    }
  } catch (error) {
    notify(error.message || "Something went wrong. Please try again.", true);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modal) closeModal();
});

root.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.dataset.form === "auth") {
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await signIn(form);
    } catch (error) {
      notify(error.message, true);
    } finally {
      submit.disabled = false;
    }
  } else if (form.dataset.form === "search") {
    const formData = new FormData(form);
    state.query = String(formData.get("query") || "").trim();
    state.folderStack = [];
    await loadFiles();
  } else if (form.dataset.form === "modal") {
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    try {
      if (state.modal.type === "folder") {
        await api("/api/folders", {
          method: "POST",
          body: JSON.stringify({
            name,
            parentId: state.folderStack.at(-1)?.id ?? null,
          }),
        });
        notify("Folder created.");
      } else {
        await api(`/api/files/${encodeURIComponent(state.modal.file.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        notify("Name updated.");
      }
      state.modal = null;
      await loadFiles();
    } catch (error) {
      notify(error.message, true);
    }
  }
});

root.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.id === "file-picker") {
    uploadFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }
});

root.addEventListener("dblclick", async (event) => {
  const row = event.target instanceof Element ? event.target.closest(".file-row") : null;
  if (!row) return;
  const file = state.files.find((item) => item.id === row.dataset.id);
  if (!file) return;
  try {
    if (file.isFolder) openFolder(file);
    else await openPreview(file.id);
  } catch (error) {
    notify(error.message, true);
  }
});

async function start() {
  render();
  if (!state.token) return;
  try {
    const result = await api("/api/auth/me");
    state.user = result.user;
    if (!state.user) {
      state.token = null;
      sessionStorage.removeItem("gd-session");
      render();
      return;
    }
    await loadFiles();
  } catch {
    state.token = null;
    sessionStorage.removeItem("gd-session");
    render();
  }
}

start();
