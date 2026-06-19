const { app } = require("electron");
const { initSplash } = require("./windows/splash");

app.on("ready", async () => {
  initSplash();
});

app.on("window-all-closed", () => app.quit());