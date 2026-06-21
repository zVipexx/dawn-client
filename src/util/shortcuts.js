const { app, clipboard, screen } = require("electron");
const shortcut = require("electron-localshortcut");
const Store = require("electron-store");
const fs = require("fs-extra");
const path = require("path");
const store = new Store();

const registerShortcuts = (window) => {
  const register = (key, action) => shortcut.register(window, key, action);
  register("Escape", () =>
    window.webContents.executeJavaScript("document.exitPointerLock()")
  );
  register("F2", () => {
    const { x, y, width, height } = screen.getPrimaryDisplay().bounds;
    const screenshotsFolder = path.join(app.getPath("documents"), "DawnClient", "gallery", "screenshots");
    if (!fs.existsSync(screenshotsFolder)) fs.mkdirSync(screenshotsFolder, { recursive: true });

    window.capturePage({ x, y, width, height }).then((image) => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const timestamp = `dawn-${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}-${pad(now.getMinutes())}`;
      const filePath = path.join(screenshotsFolder, `${timestamp}.png`);

      fs.writeFileSync(filePath, image.toPNG());
      clipboard.writeImage(image);
      window.webContents.send("notification", {
        message: "Screenshot saved to gallery and copied to clipboard",
        icon: image.toDataURL(),
      });
    });
  });
  register("F4", () => {
    window.loadURL(store.get("settings").base_url);
  });
  register("F5", () => {
    window.reload();
  });
  register("F6", () => {
    window.loadURL(clipboard.readText());
  });
  register("F7", () => clipboard.writeText(window.webContents.getURL()));
  register("F11", () => window.setFullScreen(!window.isFullScreen()));
  register("F12", () => window.webContents.toggleDevTools());
  register("Ctrl+Shift+I", () => window.webContents.toggleDevTools());
  register("Ctrl+Shift+C", () => window.webContents.toggleDevTools());
  register("Ctrl+Shift+J", () => window.webContents.toggleDevTools());
  register("Alt+F4", () => app.quit());
};

module.exports = { registerShortcuts };
