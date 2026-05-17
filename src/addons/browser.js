const { shell, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const githubBase = "https://raw.githubusercontent.com/imnotkoolkid/KCH/main/data";

const dataUrls = {
  css: `${githubBase}/css.json`,
  commscripts: `${githubBase}/script.json`,
  maps: `${githubBase}/maps.json`,
  skins: `${githubBase}/skins.json`,
  sounds: `${githubBase}/sounds.json`,
  textures: `${githubBase}/texture.json`,
  crosshairs: `${githubBase}/crosshair.json`,
  skyboxes: `${githubBase}/skyboxes.json`,
  killicons: `${githubBase}/kill_icons.json`,
};

const cached = {};

const getData = async (key) => {
  if (cached[key]) return cached[key];
  const res = await fetch(dataUrls[key]);
  const json = await res.json();
  let data;
  if (Array.isArray(json)) {
    data = json;
  } else if (json.sounds) {
    data = json.sounds;
  } else if (json.skyboxes) {
    data = json.skyboxes;
  } else if (json.scripts) {
    data = json.scripts;
  } else if (json.killIcons) {
    data = json.killIcons;
  } else {
    data = json;
  }
  cached[key] = data;
  return data;
};

const filterItems = (data, key) => {
  const settings = ipcRenderer.sendSync("get-settings");
  if (key === "css" && settings.toggle_installable) {
    return data.filter(i => convert(i, key).availability === "free");
  }
  return data;
};

const convert = (item, type) => {
  switch (type) {
    case "css":
      return {
        title: item.title,
        description: item.description,
        previewUrl: item.homeImage,
        ingameImage: item.ingameImage || null,
        tags: item.tags,
        owner: item.owner,
        label: item.label,
        availability: item.availability,
        downloadUrl: item.downloadUrl,
        discord: item.discord,
      };
    case "crosshairs":
      return {
        title: item.id,
        previewUrl: item.Crosshair,
        tags: item.tags,
        owner: item.owner,
        label: item.label,
        availability: "free",
        downloadUrl: item.Crosshair,
        discord: item.discord,
      };
    case "textures":
      return {
        title: item.id,
        previewUrl: item.textureImage,
        tags: item.tags,
        owner: item.owner,
        label: item.label,
        availability: "free",
        downloadUrl: item.textureImage,
        discord: item.discord,
      };
    case "skyboxes":
      return {
        title: item.name,
        previewUrl: item.isPack ? item.images?.[0]?.url : item.url,
        tags: item.isPack ? ["Pack"] : ["Single"],
        owner: item.owner,
        label: item.isPack ? "pack" : "",
        availability: "free",
        downloadUrl: item.isPack ? null : item.url,
        discord: item.discord,
        isPack: item.isPack,
        images: item.images,
      };
    case "sounds":
      return {
        title: item.name,
        previewUrl: null,
        tags: [],
        owner: item.owner,
        label: "",
        availability: "free",
        downloadUrl: null,
        audioFiles: item.audioFiles,
      };
    case "commscripts":
      return {
        title: item.name,
        description: item.description,
        previewUrl: null,
        tags: [],
        owner: item.owner,
        label: "",
        availability: "free",
        downloadUrl: item.url,
        discord: item.discord,
      };
    case "killicons":
      return {
        title: item.name,
        previewUrl: item.url,
        tags: [],
        owner: item.owner,
        label: "",
        availability: "free",
        downloadUrl: item.url,
        discord: item.discord,
      };
    default:
      return {
        title: item.name || item.title || item.id || "Unknown",
        previewUrl: item.homeImage || item.previewUrl || item.image || item.url || null,
        tags: item.tags || [],
        owner: item.owner || "",
        label: item.label || "",
        availability: item.availability || "free",
        downloadUrl: item.downloadUrl || item.url || null,
        discord: item.discord || "",
      };
  }
};

const isInstallType = (type) => ["css", "commscripts", "sounds", "crosshairs", "textures", "skyboxes", "killicons"].includes(type);
const hasDirectLink = (type) => ["crosshairs", "textures", "skyboxes", "killicons", "maps", "skins"].includes(type);

const downloadFile = async (url, dest) => {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(buf));
};

const toStyleUrl = (url) => {
  if (url.includes("raw.githubusercontent.com")) {
    return url.replace("https://raw.githubusercontent.com/", "https://rawcdn.githack.com/");
  }
  return url;
};

const applyCss = (downloadUrl) => {
  const styleUrl = toStyleUrl(downloadUrl);
  ipcRenderer.send("update-setting", "css_link", styleUrl);
  ipcRenderer.send("update-setting", "css_enabled", true);
  document.dispatchEvent(new CustomEvent("juice-settings-changed", { detail: { setting: "css_link", value: styleUrl } }));
  document.dispatchEvent(new CustomEvent("juice-settings-changed", { detail: { setting: "css_enabled", value: true } }));
};

const removeCss = () => {
  ipcRenderer.send("update-setting", "css_link", "");
  ipcRenderer.send("update-setting", "css_enabled", false);
  document.dispatchEvent(new CustomEvent("juice-settings-changed", { detail: { setting: "css_link", value: "" } }));
  document.dispatchEvent(new CustomEvent("juice-settings-changed", { detail: { setting: "css_enabled", value: false } }));
};

const applyCrosshair = (url) => {
  localStorage.setItem("SETTINGS___SETTING/CROSSHAIR___SETTING/STATIC_URL___SETTING", url);
  localStorage.setItem("SETTINGS___SETTING/SNIPER___SETTING/SCOPE_URL___SETTING", url);
};

const removeCrosshair = () => {
  localStorage.removeItem("SETTINGS___SETTING/CROSSHAIR___SETTING/STATIC_URL___SETTING");
  localStorage.removeItem("SETTINGS___SETTING/SNIPER___SETTING/SCOPE_URL___SETTING");
};

const applyTexture = (url) => {
  localStorage.setItem("SETTINGS___SETTING/BLOCKS___SETTING/TEXTURE_URL___SETTING", url);
};

const removeTexture = () => {
  localStorage.removeItem("SETTINGS___SETTING/BLOCKS___SETTING/TEXTURE_URL___SETTING");
};

const skyboxKeys = [
  "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG3___SETTING",
  "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG4___SETTING",
  "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG2___SETTING",
  "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG1___SETTING",
  "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG6___SETTING",
  "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG5___SETTING",
];

const applySkybox = (raw) => {
  if (raw.isPack && raw.images) {
    raw.images.forEach((img, i) => { if (skyboxKeys[i]) localStorage.setItem(skyboxKeys[i], img.url); });
    ipcRenderer.send("update-setting", "skybox_url", raw.images[0].url);
  } else {
    skyboxKeys.forEach(k => localStorage.setItem(k, raw.url));
    ipcRenderer.send("update-setting", "skybox_url", raw.url);
  }
};

const removeSkybox = () => {
  skyboxKeys.forEach(k => localStorage.removeItem(k));
  ipcRenderer.send("update-setting", "skybox_url", "");
};

const applyKillIcon = (url) => {
  document.dispatchEvent(new CustomEvent("juice-settings-changed", { detail: { setting: "killicon_link", value: url } }));

  let styleEl = document.getElementById("juice-styles-ui-features");

  const rule = `.animate-cont::before { content: ""; background: url(${url}); width: 10rem; height: 10rem; margin-bottom: 2rem; display: inline-block; background-position: center; background-size: contain; background-repeat: no-repeat; } .animate-cont svg { display: none; }`;
  if (!styleEl.innerHTML.includes("animate-cont")) {
    styleEl.innerHTML += rule;
  } else {
    styleEl.innerHTML = styleEl.innerHTML.replace(
      /\.animate-cont::before \{[^}]*\}/,
      `.animate-cont::before { content: ""; background: url(${url}); width: 10rem; height: 10rem; margin-bottom: 2rem; display: inline-block; background-position: center; background-size: contain; background-repeat: no-repeat; }`
    );
  }
};

const removeKillIcon = () => {
  document.dispatchEvent(new CustomEvent("juice-settings-changed", { detail: { setting: "killicon_link", value: "" } }));

  const styleEl = document.getElementById("juice-styles-ui-features");
  if (styleEl) {
    styleEl.innerHTML = styleEl.innerHTML
      .replace(/\.animate-cont::before \{[^}]*\}/, "")
      .replace(/\.animate-cont svg \{ display: none; \}/, "");
  }
};

const installScript = async (url, title) => {
  const scriptsDir = path.join(os.homedir(), "Documents", "DawnClient", "scripts");
  const ext = url.split(".").pop().split("?")[0];
  const filename = `${title.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
  await downloadFile(url, path.join(scriptsDir, filename));
  return path.join(scriptsDir, filename);
};

const uninstallScript = (title) => {
  const scriptsDir = path.join(os.homedir(), "Documents", "DawnClient", "scripts");
  const files = fs.readdirSync(scriptsDir);
  const safe = title.replace(/[^a-z0-9]/gi, "_");
  files.filter(f => f.startsWith(safe)).forEach(f => fs.unlinkSync(path.join(scriptsDir, f)));
};

const soundsDir = path.join(os.homedir(), "Documents", "DawnClient", "swapper", "assets", "media");

const installSounds = async (audioFiles) => {
  fs.mkdirSync(soundsDir, { recursive: true });
  for (const file of audioFiles) {
    if (!file.url.endsWith(".mp3")) continue;
    const filename = path.basename(decodeURIComponent(file.url.split("?")[0]));
    await downloadFile(file.url, path.join(soundsDir, filename));
  }
};

const uninstallSounds = (audioFiles) => {
  for (const file of audioFiles) {
    if (!file.url.endsWith(".mp3")) continue;
    const filename = path.basename(decodeURIComponent(file.url.split("?")[0]));
    const filePath = path.join(soundsDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

const isInstalled = (type, item) => {
  const settings = ipcRenderer.sendSync("get-settings");
  switch (type) {
    case "css":
      return (
        settings.css_enabled &&
        (settings.css_link === item.downloadUrl || settings.css_link === toStyleUrl(item.downloadUrl))
      );
    case "crosshairs":
      return localStorage.getItem("SETTINGS___SETTING/CROSSHAIR___SETTING/STATIC_URL___SETTING") === item.downloadUrl;
    case "textures":
      return localStorage.getItem("SETTINGS___SETTING/BLOCKS___SETTING/TEXTURE_URL___SETTING") === item.downloadUrl;
    case "skyboxes":
      return localStorage.getItem(skyboxKeys[0]) === (item.isPack ? item.images?.[0]?.url : item.downloadUrl);
    case "killicons":
      return settings.killicon_link === item.downloadUrl;
    case "commscripts": {
      const scriptsDir = path.join(os.homedir(), "Documents", "DawnClient", "scripts");
      const safe = item.title.replace(/[^a-z0-9]/gi, "_");
      try { return fs.readdirSync(scriptsDir).some(f => f.startsWith(safe)); } catch { return false; }
    }
    case "sounds": {
      if (!item.audioFiles?.length) return false;
      const first = item.audioFiles.find(f => f.url.endsWith(".mp3"));
      if (!first) return false;
      const filename = path.basename(decodeURIComponent(first.url.split("?")[0]));
      try { return fs.existsSync(path.join(soundsDir, filename)); } catch { return false; }
    }
    default:
      return false;
  }
};

let lightboxItems = [];
let lightboxIndex = 0;

const openLightbox = (urls, index = 0) => {
  lightboxItems = Array.isArray(urls) ? urls : [urls];
  lightboxIndex = index;

  let overlay = document.getElementById("juice-lightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "juice-lightbox";
    overlay.innerHTML = `
      <div class="juice-lightbox-backdrop"></div>
      <img class="juice-lightbox-img" draggable="false""/>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.style.visibility = "hidden";
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
      overlay.classList.remove("active");
    };

    overlay.addEventListener("click", () => {
      overlay.addEventListener("click", close);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("active")) close();
    });
  }

  updateLightbox();
  overlay.classList.add("active");
  overlay.style.visibility = "visible";
  overlay.style.opacity = "1";
  overlay.style.pointerEvents = "auto";
};

const updateLightbox = () => {
  const overlay = document.getElementById("juice-lightbox");
  if (!overlay) return;
  overlay.querySelector(".juice-lightbox-img").src = lightboxItems[lightboxIndex];
};

const renderCards = (container, items, type, allRaw) => {
  container.querySelectorAll(".community-card").forEach(el => el.remove());

  items.forEach((raw) => {
    const item = convert(raw, type);
    const card = document.createElement("div");
    card.className = `community-card ${item.availability || "free"}`;

    const showPreview = type !== "commscripts" && type !== "sounds";
    const isPaid = item.availability === "paid";
    const isShowcase = item.availability === "showcase";
    const cantInstall = isPaid || isShowcase || (!item.downloadUrl && type !== "sounds" && type !== "skyboxes");

    const installed = !cantInstall && isInstalled(type, item);

    const hasIngame = type === "css" && !!item.ingameImage;
    let previewHtml = "";
    if (showPreview) {
      if (!item.previewUrl) {
        previewHtml = `<div class="card-no-preview">No Preview</div>`;
      } else {
        previewHtml = `<img src="${item.previewUrl}" alt="${item.title}" draggable="false" class="card-img" />`;
        if (hasIngame) {
          previewHtml += `<div class="card-preview-dots">
                <span class="preview-dot active"></span>
                <span class="preview-dot"></span>
               </div>`;
        }
      }
    }

    let btnText;
    if (cantInstall) {
      btnText = isPaid ? "Paid" : "Showcase";
    } else if (installed) {
      btnText = "Uninstall";
    } else {
      btnText = isInstallType(type) ? "Install" : "Download";
    }

    let btnClass;
    if (cantInstall) {
      btnClass = item.availability;
    } else if (installed) {
      btnClass = "uninstall";
    } else {
      btnClass = item.availability || "free";
    }

    let linkBtn = "";
    if (hasDirectLink(type) && item.downloadUrl && !cantInstall) {
      linkBtn = `<button class="card-link-btn" title="Copy link"><i class="fas fa-link"></i></button>`;
    }

    let soundsPreviewBtn = "";
    if (type === "sounds") {
      soundsPreviewBtn = `<button class="card-external-btn" title="Preview online"><i class="fas fa-external-link-alt"></i></button>`;
    }

    card.innerHTML = `
      ${showPreview ? `<div class="card-preview">${previewHtml}${item.label ? `<span class="card-label">${item.label}</span>` : ""}</div>` : ""}
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        ${item.description ? `<div class="card-desc">${item.description}</div>` : ""}
        ${item.tags?.length ? `<div class="card-tags">${item.tags.map(t => `<span class="card-tag">${t}</span>`).join("")}</div>` : ""}
        <div class="card-footer">
          <span class="card-owner">${item.owner || ""}</span>
          <div class="card-actions">
            ${soundsPreviewBtn}
            ${linkBtn}
            <button class="card-btn ${btnClass}" ${cantInstall ? "disabled" : ""}>${btnText}</button>
          </div>
        </div>
      </div>
    `;

    if (showPreview && item.previewUrl) {
      const previewDiv = card.querySelector(".card-preview");

      if (hasIngame) {
        const dotsContainer = card.querySelector(".card-preview-dots");
        const dots = card.querySelectorAll(".preview-dot");
        const cardImg = card.querySelector(".card-img");
        const srcs = [item.previewUrl, item.ingameImage];
        let current = 0;

        dotsContainer?.addEventListener("click", (e) => {
          e.stopPropagation();
          current = (current + 1) % 2;
          cardImg.src = srcs[current];
          dots.forEach((d, i) => d.classList.toggle("active", i === current));
        });
      }

      previewDiv?.addEventListener("click", (e) => {
        if (e.target.classList.contains("card-label")) return;
        if (e.target.closest(".card-preview-dots")) return;

        const imgs = [];
        if (item.isPack && item.images?.length) {
          item.images.forEach(img => imgs.push(img.url));
        } else if (hasIngame) {
          imgs.push(card.querySelector(".card-img").src);
        } else if (item.previewUrl) {
          imgs.push(item.previewUrl);
        }

        openLightbox(imgs, 0);
      });
    }

    if (hasDirectLink(type) && item.downloadUrl) {
      const linkBtnEl = card.querySelector(".card-link-btn");
      linkBtnEl?.addEventListener("click", () => {
        navigator.clipboard.writeText(item.downloadUrl);
        linkBtnEl.innerHTML = `<i class="fas fa-check"></i>`;
        linkBtnEl.classList.add("copied");
        setTimeout(() => {
          linkBtnEl.innerHTML = `<i class="fas fa-link"></i>`;
          linkBtnEl.classList.remove("copied");
        }, 1500);
      });
    }

    card.querySelector(".card-external-btn")?.addEventListener("click", () => {
      shell.openExternal("https://kirkacommunityhub.pages.dev/assets#sounds");
    });

    const btn = card.querySelector(".card-btn");
    if (btn && !cantInstall) {
      btn.addEventListener("click", async () => {
        const currentlyInstalled = isInstalled(type, item);

        if (currentlyInstalled) {
          switch (type) {
            case "css": removeCss(); break;
            case "crosshairs": removeCrosshair(); break;
            case "textures": removeTexture(); break;
            case "skyboxes": removeSkybox(); break;
            case "killicons": removeKillIcon(); break;
            case "commscripts": uninstallScript(item.title); break;
            case "sounds": uninstallSounds(raw.audioFiles); break;
          }
          btn.textContent = isInstallType(type) ? "Install" : "Download";
          btn.className = `card-btn ${item.availability || "free"}`;
          return;
        }

        try {
          btn.textContent = "...";
          btn.disabled = true;

          switch (type) {
            case "css": applyCss(item.downloadUrl); break;
            case "crosshairs": applyCrosshair(item.downloadUrl); break;
            case "textures": applyTexture(item.downloadUrl); break;
            case "skyboxes": applySkybox(raw); break;
            case "killicons": applyKillIcon(item.downloadUrl); break;
            case "commscripts": await installScript(item.downloadUrl, item.title); break;
            case "sounds": await installSounds(raw.audioFiles); break;
            default: {
              const ext = item.downloadUrl.split(".").pop().split("?")[0];
              const filename = `${item.title.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
              const dest = path.join(os.homedir(), "Downloads", filename);
              await downloadFile(item.downloadUrl, dest);
            }
          }

          btn.textContent = isInstallType(type) ? "Uninstall" : "Download";
          btn.className = "card-btn uninstall";
          btn.disabled = false;

          if (["css", "crosshairs", "textures", "skyboxes", "killicons"].includes(type)) {
            const container = btn.closest(`#${type}-options`);
            if (container) {
              container.querySelectorAll(".card-btn.uninstall").forEach(otherBtn => {
                if (otherBtn !== btn) {
                  otherBtn.textContent = "Install";
                  otherBtn.className = `card-btn free`;
                }
              });
            }
          }

        } catch (e) {
          console.error(e);
          btn.textContent = "Error";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = isInstallType(type) ? "Install" : "Download";
            btn.disabled = false;
          }, 2000);
        }
      });
    }

    container.appendChild(card);
  });
};

const initBrowser = (menu) => {
  const selectors = menu.querySelectorAll(".community-sidebar .juice.selector");
  const panels = menu.querySelectorAll("#community-options .content .juice.options");
  const searchInput = menu.querySelector(".juice.search") || menu.querySelector(".juice.community-search");

  let currentKey = "css";
  let currentItems = [];

  const loadSection = async (key) => {
    currentKey = key;
    const container = menu.querySelector(`#${key}-options`);
    if (!container) return;
    try {
      const data = await getData(key);
      currentItems = data;
      const query = searchInput?.value?.toLowerCase() || "";
      let filtered;
      if (query) {
        filtered = data.filter(i => {
          const n = convert(i, key);
          return n.title?.toLowerCase().includes(query) || n.tags?.some(t => t.toLowerCase().includes(query));
        });
      } else {
        filtered = data;
      }
      filtered = filterItems(filtered, key);
      renderCards(container, filtered, key, data);
    } catch (e) {
      console.error(e);
      container.textContent = "Failed to load.";
    }
  };

  document.addEventListener("juice-settings-changed", (e) => {
    if (e.detail.setting === "toggle_installable") loadSection(currentKey);
  });

  selectors.forEach((sel) => {
    sel.addEventListener("click", () => {
      selectors.forEach(s => s.classList.remove("active"));
      panels.forEach(p => p.classList.remove("selected"));
      sel.classList.add("active");
      const key = sel.dataset.selector;
      const panel = menu.querySelector(`#${key}-options`);
      if (panel) panel.classList.add("selected");
      loadSection(key);
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const container = menu.querySelector(`#${currentKey}-options`);
      if (!container || !currentItems.length) return;
      let filtered;
      if (query) {
        filtered = currentItems.filter(i => {
          const n = convert(i, currentKey);
          return n.title?.toLowerCase().includes(query) || n.tags?.some(t => t.toLowerCase().includes(query));
        });
      } else {
        filtered = currentItems;
      }
      renderCards(container, filtered, currentKey, currentItems);
    });
  }

  const lastOpenedSelector = localStorage.getItem("juice-menu-selector");
  loadSection(lastOpenedSelector);
};

module.exports = { initBrowser };