const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const { initGame } = require("./game");
const path = require("path");

autoUpdater.autoDownload = true;

autoUpdater.setFeedURL({
  provider: "github",
  owner: "zVipexx",
  repo: "dawn-client",
});

let splashWindow;

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
  autoUpdater.on("update-available", () =>
    splashWindow.webContents.send("update-available")
  );
  autoUpdater.on("update-not-available", () => {
    splashWindow.webContents.send("update-not-available");
    handleClose();
  });
  autoUpdater.on("update-downloaded", () => {
    splashWindow.webContents.send("update-downloaded");
    console.log("Update downloaded");
  });
  autoUpdater.on("download-progress", (progress) =>
    splashWindow.webContents.send("download-progress", progress)
  );
  autoUpdater.on("error", (err) => {
    splashWindow.webContents.send("update-error", err.message);
    setTimeout(handleClose, 3000);
  });
  autoUpdater.checkForUpdates().catch(handleClose);
};

const handleClose = () =>
  setTimeout(() => {
    if (splashWindow) {
      initGame();
      splashWindow.close();
    }
  }, 500);

const initSplash = createWindow;

module.exports = { initSplash };
