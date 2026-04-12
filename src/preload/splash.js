const { ipcRenderer } = require("electron");
const version = require("../../package.json").version;

document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.querySelector(".ver");
  const statusElement = document.querySelector(".status");
  const statusContainerElement = document.querySelector(".status-container");
  const iconElement = document.querySelector(".icon");
  const titleElement = document.querySelector(".title");

  ipcRenderer.on("splash-ready", () => {
    setTimeout(() => {
      iconElement.style.transform = "translateY(calc(-120% + 50px)) scale(0.4)";
      versionElement.style.opacity = "1";
      titleElement.style.opacity = "1";
      versionElement.style.top = "69px";
      titleElement.style.top = "40px";
      statusContainerElement.style.opacity = "1";
    }, 1000);
  });

  versionElement.textContent = `v${version}`;

  const updateStatus = (status) => {
    const newLine = document.createElement("div");
    newLine.textContent = status;
    statusElement.appendChild(newLine);
  };

  ipcRenderer.send("check-for-updates");
  updateStatus("Checking for updates...");

  ipcRenderer.on("update-available", () =>
    updateStatus("Update available! Downloading...")
  );
  ipcRenderer.on("update-not-available", () =>
    updateStatus("No updates available. Launching...")
  );

  ipcRenderer.on("update-downloaded", () => {
    updateStatus("Update downloaded! Installing...");
    ipcRenderer.send("quit-and-install");
  });

  ipcRenderer.on("download-progress", (_, progress) =>
    updateStatus(`Downloading update: ${Math.round(progress.percent)}%`)
  );

  ipcRenderer.on("update-error", (event, err) => {
    const message = err?.message || err || "unknown error";
    updateStatus(`Something went wrong: ${message}. Launching...`);
  });
});