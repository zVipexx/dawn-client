const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const { initGame } = require("./game");
const path = require("path");
const Store = require("electron-store");

autoUpdater.setFeedURL({
  provider: "github",
  owner: "zVipexx",
  repo: "dawn-client",
});

let splashWindow;
const store = new Store();

const createWindow = () => {
  splashWindow = new BrowserWindow({
    icon: path.join(__dirname, "../assets/img/icon.png"),
    width: 500,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "../preload/splash.js"),
    },
  });

  splashWindow.loadFile(path.join(__dirname, "../assets/html/splash.html"));
  splashWindow.once("ready-to-show", () => {
    splashWindow.show();
    splashWindow.webContents.send("splash-ready");
    app.isPackaged ? checkForUpdates() : handleClose();
  });

  splashWindow.on("closed", () => {
    ipcMain.removeAllListeners("quit-and-install");
    splashWindow = null;
  });
};

ipcMain.on("quit-and-install", () =>
  autoUpdater.quitAndInstall()
);

const checkForUpdates = () => {
  if (!store.get("settings").auto_update) {
    handleClose();
    return;
  };

  autoUpdater.on("update-available", () =>
    splashWindow.webContents.send("update-available")
  );
  autoUpdater.on("update-not-available", () => {
    handleClose();
  });
  autoUpdater.on("update-downloaded", () => {
    splashWindow.webContents.send("update-downloaded");
  });
  autoUpdater.on("download-progress", (progress) =>
    splashWindow.webContents.send("download-progress", progress)
  );
  autoUpdater.on("error", (err) => {
    handleClose();
  });
  autoUpdater.checkForUpdates().catch(handleClose);
};

const handleClose = () => {
  if (splashWindow) {
    initGame();
    splashWindow.close();
  }
};

const initSplash = createWindow;

module.exports = { initSplash };