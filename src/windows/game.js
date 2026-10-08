const { BrowserWindow, ipcMain, app, shell, clipboard, dialog, net, session, protocol } = require("electron");
const { default_settings, allowed_urls } = require("../util/defaults.json");
const { initResourceSwapper } = require("../addons/swapper.js");
const { registerShortcuts } = require("../util/shortcuts");
const { applySwitches } = require("../util/switches");
const DiscordRPC = require("../addons/rpc");
const path = require("path");
const https = require("https");
const Store = require("electron-store");
const fs = require("fs-extra");
const ffmpeg = require("fluent-ffmpeg");
let ffmpegPath = require("ffmpeg-static");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "https",
    privileges: { bypassCSP: true, secure: true, supportFetchAPI: true },
  },
  {
    scheme: "dawn-patch",
    privileges: { standard: true, bypassCSP: true, secure: true, supportFetchAPI: true },
  },
]);

const store = new Store();
if (!store.has("settings")) {
  store.set("settings", default_settings);
}

const settings = store.get("settings");

for (const key in default_settings) {
  if (!settings.hasOwnProperty(key) || typeof settings[key] !== typeof default_settings[key]) {
    settings[key] = default_settings[key];
    store.set("settings", settings);
  }
}

if (!allowed_urls.includes(settings.base_url)) {
  settings.base_url = default_settings.base_url;
  store.set("settings", settings);
}

const bundleFilter = "*://*/assets/js/app.*.js";
const bundleRegex = /\/assets\/js\/app\.[^/?]+\.js/;

const patchBundle = (src) => {
  return src.replace(
    /(function hM\(iJ,iK,iL\)\{var \w+=\w+,iM=)([^;]*?);(if\(iJ\)\{)/,
    "$1window.flagHidden?false:$2;$3"
  );
};

const downloadText = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "user-agent": "Mozilla/5.0", "accept-encoding": "identity" } }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error("Status " + res.statusCode));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
};

ipcMain.on("get-settings", (e) => {
  e.returnValue = settings;
});

ipcMain.on("update-setting", (e, key, value) => {
  if (typeof default_settings[key] === "number") value = Number(value);
  settings[key] = value;
  store.set("settings", settings);
});

ipcMain.handle("ping-url", async (_event, url) => {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;

    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const request = net.request({ method: "HEAD", url });

    request.on("response", () => done(Date.now() - start));
    request.on("error", () => done(null));

    setTimeout(() => {
      try {
        request.abort();
      } catch { }
      done(null);
    }, 3000);

    request.end();
  });
});

ipcMain.on("open-swapper-folder", () => {
  const swapperPath = path.join(app.getPath("documents"), "DawnClient/swapper/assets");

  if (!fs.existsSync(swapperPath)) {
    fs.mkdirSync(swapperPath, { recursive: true });
    shell.openPath(swapperPath);
  } else {
    shell.openPath(swapperPath);
  }
});

const scriptsPath = path.join(app.getPath("documents"), "DawnClient/scripts");

if (!fs.existsSync(scriptsPath)) {
  fs.mkdirSync(scriptsPath, { recursive: true });
}

ipcMain.on("open-scripts-folder", () => {
  shell.openPath(scriptsPath);
});

ipcMain.on("open-skins-folder", () => {
  const skinsPath = path.join(app.getPath("documents"), "DawnClient/swapper/assets/img");

  if (!fs.existsSync(skinsPath)) {
    fs.mkdirSync(skinsPath, { recursive: true });
    shell.openPath(skinsPath);
  } else {
    shell.openPath(skinsPath);
  }
});

ipcMain.on("get-sounds-path", (e) => {
  const soundsPath = path.join(app.getPath("documents"), "DawnClient/swapper/assets/media");
  if (!fs.existsSync(soundsPath)) {
    fs.mkdirSync(soundsPath, { recursive: true });
  }
  e.returnValue = soundsPath;
});

ipcMain.on("open-sounds-folder", () => {
  const soundsPath = path.join(app.getPath("documents"), "DawnClient/swapper/assets/media");

  if (!fs.existsSync(soundsPath)) {
    fs.mkdirSync(soundsPath, { recursive: true });
    shell.openPath(soundsPath);
  } else {
    shell.openPath(soundsPath);
  }
});

const galleryFolder = path.join(app.getPath("documents"), "DawnClient/gallery");
if (!fs.existsSync(galleryFolder)) fs.mkdirSync(galleryFolder, { recursive: true });

ipcMain.handle("get-file-preview", (event, filePath) => {
  const fs = require("fs");
  const ext = filePath.split(".").pop().toLowerCase();
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  const mime = mimeTypes[ext] || "image/png";
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString("base64")}`;
});

ipcMain.handle("get-gallery-root", () => {
  return galleryFolder;
});

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.watch(galleryFolder, (eventType, filename) => {
  if (filename) BrowserWindow.getAllWindows().forEach((win) => win.webContents.send("gallery-updated"));
});

ipcMain.on("open-category-folder", (event, folderPath) => {
  try {
    if (fs.existsSync(folderPath)) shell.openPath(folderPath);
    else console.warn("Folder not found:", folderPath);
  } catch (err) {
    console.error("Failed to open folder:", err);
  }
});

ipcMain.on("open-import", async (event, categoryPath) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select file to import",
    defaultPath: categoryPath,
    properties: ["openFile"],
    filters: [
      {
        name: "All Supported",
        extensions: ["txt", "json", "css", "png", "jpg", "jpeg", "gif", "webp"],
      },
    ],
  });
  if (!canceled && filePaths.length > 0) {
    const filePath = filePaths[0];
    fs.copyFileSync(filePath, path.join(categoryPath, path.basename(filePath)));
    event.sender.send("gallery-updated");
  }
});

ipcMain.on("import-file", (event, categoryPath, filePath) => {
  try {
    if (!fs.statSync(filePath).isFile()) {
      return;
    }

    const fileName = path.basename(filePath);
    const targetPath = path.join(categoryPath, fileName);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(filePath, targetPath);

    event.reply("gallery-updated");
  } catch (err) {
    console.error(err);
  }
});

ipcMain.on("delete-file", (event, filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  event.reply("gallery-updated");
});

ipcMain.on("rename-file", (event, oldPath, newName) => {
  const newPath = path.join(path.dirname(oldPath), newName);
  if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
  event.reply("gallery-updated");
});

ipcMain.on("copy-image-path", (event, imgPath) => {
  if (fs.existsSync(imgPath)) {
    clipboard.writeText(imgPath);
    event.sender.send("image-path-copied");
  }
});

ipcMain.on("copy-file-content", (event, filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      clipboard.writeText(content);
      event.sender.send("file-content-copied");
    } catch (err) {
      console.error("Failed to copy file content:", err);
    }
  }
});

ipcMain.on("get-gallery", (event) => {
  const categories = [];
  const subfolders = fs
    .readdirSync(galleryFolder, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  const rootFiles = fs.readdirSync(galleryFolder).filter((f) => fs.statSync(path.join(galleryFolder, f)).isFile());

  if (rootFiles.length) {
    categories.push({
      name: "Root",
      path: galleryFolder,
      files: rootFiles.map((f) => ({
        name: f,
        path: path.join(galleryFolder, f),
      })),
    });
  }

  for (const folder of subfolders) {
    const folderPath = path.join(galleryFolder, folder);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => fs.statSync(path.join(folderPath, f)).isFile())
      .map((f) => ({ name: f, path: path.join(folderPath, f) }));
    categories.push({ name: folder, path: folderPath, files });
  }

  event.sender.send("gallery-list", categories);
});

ipcMain.on("open-file", (event, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.openPath(filePath).then((result) => {
      if (result) console.error("Failed to open file:", result);
    });
  } else {
    console.warn("File not found:", filePath);
  }
});

ipcMain.on("import-folder-recursive", (event, folderPath) => {
  try {
    const dest = path.join(galleryFolder, path.basename(folderPath));
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    copyRecursiveSync(folderPath, dest);
    event.reply("gallery-updated");
  } catch (err) {
    console.error("Failed to import folder :", err);
    event.reply("import-folder-error", err.toString());
  }
});

const quickCssPath = path.join(app.getPath("documents"), "DawnClient", "quickcss.css");
if (!fs.existsSync(quickCssPath)) {
  fs.writeFileSync(quickCssPath, "", "utf8");
}

ipcMain.on("get-quickcss-path", (e) => {
  e.returnValue = quickCssPath;
});

ipcMain.on("reset-juice-settings", () => {
  store.set("settings", default_settings);
  fs.writeFileSync(quickCssPath, "", "utf8");
  app.relaunch();
  app.quit();
});

ipcMain.on("save-skin-local", (event, skinname, filePath) => {
  const skinsFolder = path.join(app.getPath("documents"), "DawnClient/swapper/assets/img");
  if (!fs.existsSync(skinsFolder)) fs.mkdirSync(skinsFolder, { recursive: true });

  const fileBuffer = fs.readFileSync(filePath);
  const savePath = path.join(skinsFolder, skinname);
  fs.writeFileSync(savePath, fileBuffer);
});

ipcMain.on("save-skin-from-buffer", (event, skinname, buffer) => {
  const skinsFolder = path.join(app.getPath("documents"), "DawnClient/swapper/assets/img");
  if (!fs.existsSync(skinsFolder)) fs.mkdirSync(skinsFolder, { recursive: true });

  const savePath = path.join(skinsFolder, skinname);
  fs.writeFileSync(savePath, buffer);
});

if (ffmpegPath.includes("app.asar")) {
  ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
}

ffmpeg.setFfmpegPath(ffmpegPath);

ipcMain.on("save-sound", (event, soundname, filePath, volume) => {
  try {
    const soundsFolder = path.join(app.getPath("documents"), "DawnClient/swapper/assets/media");
    if (!fs.existsSync(soundsFolder)) {
      fs.mkdirSync(soundsFolder, { recursive: true });
    }

    const inputPath = path.resolve(filePath);
    const savePath = path.join(soundsFolder, soundname);

    ffmpeg(inputPath)
      .setFfmpegPath(ffmpegPath)
      .audioFilters(`volume=${volume}`)
      .output(savePath)
      .on("end", () => event.reply("save-sound-success"))
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        event.reply("save-sound-error", err.message);
      })
      .run();
  } catch (err) {
    event.reply("save-sound-error", err.message);
  }
});

ipcMain.on("navigate", (_, url) => {
  gameWindow.loadURL(url);
});

applySwitches(settings);

let gameWindow = null;

const createWindow = () => {
  gameWindow = new BrowserWindow({
    fullscreen: process.platform !== "darwin" && settings.auto_fullscreen,
    icon: path.join(__dirname, "../assets/img/icon.ico"),
    title: "Dawn Client",
    width: 1280,
    height: 720,
    show: false,
    backgroundColor: "#141414",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      sandbox: false,
      webSecurity: false,
      preload: path.join(__dirname, "../preload/game.js"),
    },
  });

  if (process.platform === "darwin" && settings.auto_fullscreen) {
    gameWindow.once("ready-to-show", () => {
      gameWindow.setFullScreen(true);
    });
  }

  const scriptsPath = path.join(app.getPath("documents"), "DawnClient", "scripts");
  if (!fs.existsSync(scriptsPath)) {
    fs.mkdirSync(scriptsPath, { recursive: true });
  }

  ipcMain.on("get-scripts-path", (e) => {
    e.returnValue = scriptsPath;
  });

  gameWindow.webContents.on("new-window", (e, url) => {
    e.preventDefault();
    require("electron").shell.openExternal(url);
  });

  gameWindow.webContents.on("did-navigate-in-page", (e, url) => {
    gameWindow.webContents.send("url-change", url);

    if (settings.discord_rpc && gameWindow.DiscordRPC) {
      const base_url = settings.base_url;
      const stateMap = {
        [`${base_url}`]: "In the lobby",
        [`${base_url}hub/leaderboard`]: "Viewing the leaderboard",
        [`${base_url}hub/clans/champions-league`]: "Viewing the clan leaderboard",
        [`${base_url}hub/clans/my-clan`]: "Viewing their clan",
        [`${base_url}hub/market`]: "Viewing the market",
        [`${base_url}hub/live`]: "Viewing videos",
        [`${base_url}hub/news`]: "Viewing news",
        [`${base_url}hub/terms`]: "Viewing the terms of service",
        [`${base_url}store`]: "Viewing the store",
        [`${base_url}servers/main`]: "Viewing main servers",
        [`${base_url}servers/parkour`]: "Viewing parkour servers",
        [`${base_url}servers/custom`]: "Viewing custom servers",
        [`${base_url}quests/hourly`]: "Viewing hourly quests",
        [`${base_url}friends`]: "Viewing friends",
        [`${base_url}inventory`]: "Viewing their inventory",
      };

      let state;

      if (stateMap[url]) {
        state = stateMap[url];
      } else if (url.startsWith(`${base_url}games/`) || url.startsWith(`${base_url}hub/ranked`)) {
        state = "In a match";
      } else if (url.startsWith(`${base_url}profile/`)) {
        state = "Viewing a profile";
      } else {
        state = "In the lobby";
      }

      gameWindow.DiscordRPC.setState(state);
    }
  });

  gameWindow.loadURL(settings.base_url);
  gameWindow.removeMenu();
  gameWindow.maximize();

  gameWindow.once("ready-to-show", () => {
    gameWindow.show();
  });

  registerShortcuts(gameWindow);

  gameWindow.on("page-title-updated", (e) => e.preventDefault());

  gameWindow.on("closed", () => {
    ipcMain.removeAllListeners("get-settings");
    ipcMain.removeAllListeners("update-setting");
    gameWindow = null;
  });
};

const initGame = () => {
  const swap = initResourceSwapper();

  protocol.registerBufferProtocol("dawn-patch", async (request, callback) => {
    try {
      const target = new URL(request.url).searchParams.get("u");
      const src = await downloadText(target);
      const out = patchBundle(src);
      callback({ mimeType: "application/javascript", data: Buffer.from(out, "utf8") });
    } catch (err) {
      callback({ error: -2 });
    }
  });

  session.defaultSession.webRequest.onBeforeRequest({ urls: [...swap.filter.urls, bundleFilter] }, (details, callback) => {
    const swapped = swap.files[details.url.replace(/https|http|(\?.*)|(#.*)|\_/gi, "")];

    if (!swapped && bundleRegex.test(details.url)) {
      return callback({ cancel: false, redirectURL: "dawn-patch://bundle/?u=" + encodeURIComponent(details.url) });
    }

    const redirect = "dawnclient://" + (swapped || details.url);
    return callback({ cancel: false, redirectURL: redirect });
  });

  createWindow();
  if (settings.discord_rpc) {
    gameWindow.DiscordRPC = new DiscordRPC();
  }
};

module.exports = {
  initGame,
};