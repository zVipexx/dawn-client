const { ipcRenderer } = require("electron");
const lamejs = require('lamejs');

let skinname = "texture.0bed9187.webp";
let filePath = "";
let soundFilePath = "";
let buffer = null;
let soundbuffer = null;
let soundPreviewAudio = null;

let soundname = "__whoosh__.634f7dda.mp3";

const showSoundPreview = (file) => {
  const container = document.getElementById("sound-preview-container");
  const fileNameLabel = document.getElementById("sound-filename");
  const playBtn = document.getElementById("sound-play-btn");
  const volumeSlider = document.getElementById("sound-volume");
  const volumeIcon = document.getElementById("sound-volume-icon");

  fileNameLabel.textContent = file.name;
  container.style.display = "flex";

  if (soundPreviewAudio) {
    soundPreviewAudio.pause();
    soundPreviewAudio = null;
  }
  const objectURL = URL.createObjectURL(file);
  soundPreviewAudio = new Audio(objectURL);
  soundPreviewAudio.volume = volumeSlider.value;

  soundPreviewAudio.onended = () => {
    playBtn.classList.remove("pause");
    playBtn.classList.add("play");
  };

  playBtn.onclick = () => {
    if (soundPreviewAudio.paused) {
      soundPreviewAudio.play();
      playBtn.classList.remove("play");
      playBtn.classList.add("pause");
    } else {
      soundPreviewAudio.pause();
      playBtn.classList.remove("pause");
      playBtn.classList.add("play");
    }
  };

  volumeSlider.oninput = () => {
    if (soundPreviewAudio) {
      soundPreviewAudio.volume = volumeSlider.value;
    }
    if (volumeSlider.value == 0) {
      volumeIcon.textContent = "🔇";
    } else if (volumeSlider.value < 0.5) {
      volumeIcon.textContent = "🔉";
    } else {
      volumeIcon.textContent = "🔊";
    }
  };

  volumeIcon.onclick = () => {
    if (soundPreviewAudio.volume > 0) {
      soundPreviewAudio.volume = 0;
      volumeSlider.value = 0;
      volumeIcon.textContent = "🔇";
    } else {
      soundPreviewAudio.volume = 1;
      volumeSlider.value = 1;
      volumeIcon.textContent = "🔊";
    }
  };
};


const previewImage = (src) => {
  const preview = document.getElementById("preview");
  preview.src = src;
  preview.style.display = "block";
};

const editResourceSwapper = () => {
  //Skins
  const skinFileInput = document.getElementById("skin-file");
  const fileUrlInput = document.getElementById("file-url");
  const soundFileInput = document.getElementById("sound-file");

  skinFileInput?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Not an image file!");
      return;
    }

    buffer = null;
    filePath = file.path;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage(e.target.result);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("upload-skin").addEventListener("dragover", (e) => {
    e.preventDefault();
    document.getElementById("upload-skin").classList.add("drag-over");
  });
  document.getElementById("upload-skin").addEventListener("dragleave", (e) => {
    e.preventDefault();
    document.getElementById("upload-skin").classList.remove("drag-over");
  });
  document.getElementById("upload-skin").addEventListener("drop", (e) => {
    e.preventDefault();
    document.getElementById("upload-skin").classList.remove("drag-over");

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Not an image file!");
      return;
    }

    buffer = null;
    filePath = file.path;

    const reader = new FileReader();
    reader.onload = (event) => {
      previewImage(event.target.result);
    };
    reader.readAsDataURL(file);
  });

  fileUrlInput?.addEventListener("change", async (event) => {
    const url = event.target.value.trim();
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const blob = await response.blob();

      if (!blob.type.startsWith("image/")) {
        alert("URL does not point to an image.");
        return;
      }

      filePath = "";
      buffer = await blob.arrayBuffer();

      const objectURL = URL.createObjectURL(blob);
      previewImage(objectURL);
    } catch (err) {
      alert("Could not load file from the provided URL.");
    }
  });

  document.getElementById("save-skin")?.addEventListener("click", () => {
    if (filePath) {
      ipcRenderer.send("save-skin-local", skinname, filePath);
      alert("Skin saved!");
    } else if (buffer) {
      ipcRenderer.send("save-skin-from-buffer", skinname, Buffer.from(buffer));
      alert("Skin saved!");
    } else {
      alert("Please upload or provide a skin image first.");
    }
  });

  document.getElementById("skin-select")?.addEventListener("change", (e) => {
    let gunskin = document.getElementById("skin-select").value;
    if (gunskin == "revolver") {
      skinname = "__texture__.0bed9187__.webp"
    } else if (gunskin == "bayonet") {
      skinname = "__texture__.76c24e59__.webp"
    } else if (gunskin == "tomahawk") {
      skinname = "__texture__.397a3f05__.webp"
    } else if (gunskin == "ar9") {
      skinname = "__texture__.1794de31__.webp"
    } else if (gunskin == "vita") {
      skinname = "__texture__.b2a49027__.webp"
    } else if (gunskin == "scar") {
      skinname = "__texture__.b3fc7981__.webp"
    } else if (gunskin == "lar") {
      skinname = "__texture__.d97db214__.webp"
    } else if (gunskin == "mac10") {
      skinname = "__texture__.36d894bd__.webp"
    } else if (gunskin == "weatie") {
      skinname = "__texture__.212a85fe__.webp"
    } else if (gunskin == "shark") {
      skinname = "__texture__.6c8a6582__.webp"
    } else if (gunskin == "m60") {
      skinname = "__texture__.b658c822__.webp"
    }
  });

  // Sounds
  soundFileInput?.addEventListener("change", (event) => {
    const soundfile = event.target.files[0];
    if (!soundfile) return;

    soundbuffer = null;
    soundFilePath = soundfile.path;

    showSoundPreview(soundfile);
  });

  document.getElementById("upload-sound").addEventListener("dragover", (e) => {
    e.preventDefault();
    document.getElementById("upload-sound").classList.add("drag-over");
  });
  document.getElementById("upload-sound").addEventListener("dragleave", (e) => {
    e.preventDefault();
    document.getElementById("upload-sound").classList.remove("drag-over");
  });
  document.getElementById("upload-sound").addEventListener("drop", (e) => {
    e.preventDefault();
    document.getElementById("upload-sound").classList.remove("drag-over");

    const soundfile = e.dataTransfer.files[0];
    if (!soundfile) return;

    soundbuffer = null;
    soundFilePath = soundfile.path;

    showSoundPreview(soundfile);
  });

  document.getElementById("save-sound")?.addEventListener("click", () => {
    if (soundFilePath) {
      const volume = document.getElementById("sound-volume").value;
      ipcRenderer.send("save-sound", soundname, soundFilePath, volume);
    } else {
      alert("Please upload a sound file first.");
    }

    ipcRenderer.on("save-sound-success", () => {
      alert("Sound saved!");
    });
    ipcRenderer.on("save-sound-error", (event, err) => {
      alert("Error saving sound: " + err);
    });
  });

  document.getElementById("sound-select")?.addEventListener("change", (event) => {
    let gunsound = document.getElementById("sound-select").value;
    if (gunsound == "dash") {
      soundname = "__whoosh__.634f7dda.mp3";
    } else if (gunsound == "hit") {
      soundname = "__hit__.200043fa.mp3";
    } else if (gunsound == "reload") {
      soundname = "__reload__.fed3e0ac.mp3";
    } else if (gunsound == "kill1") {
      soundname = "__kill1__.623ec38b.mp3";
    } else if (gunsound == "kill2") {
      soundname = "__kill2__.8ffe9342.mp3";
    } else if (gunsound == "kill3") {
      soundname = "__kill3__.ba83d756.mp3";
    } else if (gunsound == "kill4") {
      soundname = "__kill4__.08568f50.mp3";
    } else if (gunsound == "kill5") {
      soundname = "__kill5__.cf529154.mp3";
    } else if (gunsound == "wound1") {
      soundname = "__wound1__.531f0649.mp3";
    } else if (gunsound == "wound2") {
      soundname = "__wound2__.6d084558.mp3";
    } else if (gunsound == "userevolver") {
      soundname = "__use__.cbf719c0.mp3";
    } else if (gunsound == "useknife") {
      soundname = "__use__.fd944232.mp3";
    } else if (gunsound == "usevita") {
      soundname = "__use__.5421e46b.mp3";
    } else if (gunsound == "useweatie") {
      soundname = "__use__.0621a61a.mp3";
    } else if (gunsound == "usescar") {
      soundname = "__use__.5ab6f364.mp3";
    } else if (gunsound == "uselar") {
      soundname = "__use__.8dd49954.mp3";
    } else if (gunsound == "usear9") {
      soundname = "__use__.6f884eb5.mp3";
    } else if (gunsound == "usem60") {
      soundname = "__use__.a6197a4d.mp3";
    } else if (gunsound == "useshark") {
      soundname = "__use__.4337da3c.mp3";
    } else if (gunsound == "usemac10") {
      soundname = "__use__.259ad4a5.mp3";
    } else if (gunsound == "stepgrass") {
      soundname = "__Grass__.9d721edd.mp3";
    } else if (gunsound == "stepdirt") {
      soundname = "__Earth__.37abd171.mp3";
    } else if (gunsound == "stepmud") {
      soundname = "__Mud__.44d00950.mp3";
    } else if (gunsound == "stepsand") {
      soundname = "__Sand__.10a59d13.mp3";
    } else if (gunsound == "stepstone") {
      soundname = "__Stone__.a9cedce8.mp3";
    }
  });
};

module.exports = { editResourceSwapper };
