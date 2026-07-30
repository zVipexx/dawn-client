const { app, session, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

const initResourceSwapper = () => {
  protocol.handle("dawnclient", async (request) => {
    try {
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.searchParams.get("path") || "");

      if (!filePath || !fs.existsSync(filePath)) {
        return new Response("Not Found", { status: 404 });
      }

      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".css": "text/css",
        ".js": "text/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";

      return new Response(data, {
        status: 200,
        headers: { "content-type": contentType },
      });
    } catch (error) {
      console.error("dawnclient protocol error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  const SWAP_FOLDER = path.join(
    app.getPath("documents"),
    "DawnClient",
    "swapper"
  );
  const assetsFolder = path.join(SWAP_FOLDER, "assets");
  const folders = ["css", "media", "img", "js"];
  let folder_regex_generator = "DawnClient[\\\\/]swapper[\\\\/]assets[\\\\/](";
  folder_regex_generator += folders.join("|");
  folder_regex_generator += ")[\\\\/][^\\\\/]+\\.[^.]+$";
  let folder_regex = new RegExp(folder_regex_generator, "");

  try {
    if (!fs.existsSync(assetsFolder))
      fs.mkdirSync(assetsFolder, { recursive: true });
    folders.forEach((folder) => {
      const folderPath = path.join(assetsFolder, folder);
      if (!fs.existsSync(folderPath))
        fs.mkdirSync(folderPath, { recursive: true });
    });
  } catch (e) {
    console.error(e);
  }

  const swap = {
    filter: { urls: [] },
    files: {},
  };

  const proxyUrls = [
    "snipers.io",
    "ask101math.com",
    "fpsiogame.com",
    "cloudconverts.com",
    "kirka.io",
  ];

  const allFilesSync = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) allFilesSync(filePath);
      else {
        const useAssets = folder_regex.test(filePath);
        if (!useAssets) return;

        proxyUrls.forEach((proxy) => {
          const kirk = `*://${proxy}${filePath.replace(SWAP_FOLDER, "").replace(/\\/g, "/")}*`;
          const origfilterurl = kirk.match(/\/[^\/]+\.(?:[a-zA-Z0-9]+)\*/gi)[0];
          let filterurl = origfilterurl.replace(/\_/g, "");
          filterurl = filterurl.replace("/", "/*");
          filterurl = filterurl.replace(".", "*.*");
          swap.filter.urls.push(kirk.replace(origfilterurl, filterurl));
          swap.files[kirk.replace(/\*|_/g, "")] = filePath;
        });
      }
    });
  };

  allFilesSync(SWAP_FOLDER);

  if (swap.filter.urls.length) {
    session.defaultSession.webRequest.onBeforeRequest(
      swap.filter,
      (details, callback) => {
        const cleanUrl = details.url.replace(/https|http|(\?.*)|(#.*)|\_/gi, "");
        const filePath = swap.files[cleanUrl];

        if (filePath) {
          const redirectURL = new URL("dawnclient://file");
          redirectURL.searchParams.set("path", filePath);
          return callback({ cancel: false, redirectURL: redirectURL.toString() });
        }

        callback({ cancel: false });
      }
    );
  }

  return swap;
};

module.exports = { initResourceSwapper };