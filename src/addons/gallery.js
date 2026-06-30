const { ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");

const initGallery = () => {
  function loadGallery() {
    ipcRenderer.send("get-gallery");
  }

  function isOnImport(el) {
    return el.closest(".import-button") !== null;
  }

  const galleryContainer = document.getElementById("gallery-options");
  let galleryFolderPath = null;

  (async () => {
    galleryFolderPath = await ipcRenderer.invoke("get-gallery-root");
  })();

  function getSavedCategoryStates() {
    try {
      const saved = localStorage.getItem("gallery-category-states");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCategoryState(categoryPath, isOpen) {
    try {
      const states = getSavedCategoryStates();
      states[categoryPath] = isOpen;
      localStorage.setItem("gallery-category-states", JSON.stringify(states));
    } catch (e) {
      console.error("Failed to save category state:", e);
    }
  }

  let categoriesMeta = [];

  function refreshOpenHeights() {
    const savedStates = getSavedCategoryStates();
    categoriesMeta.forEach(({ contentWrapper, arrowIcon, categoryPath }) => {
      const isOpen = savedStates.hasOwnProperty(categoryPath)
        ? savedStates[categoryPath]
        : true;
      if (isOpen) {
        contentWrapper.style.maxHeight = contentWrapper.scrollHeight + "px";
        contentWrapper.style.opacity = "1";
        arrowIcon.style.transform = "rotate(0deg)";
      } else {
        contentWrapper.style.maxHeight = "0";
        contentWrapper.style.opacity = "0";
        arrowIcon.style.transform = "rotate(-90deg)";
      }
    });
  }

  const observer = new MutationObserver(() => {
    if (galleryContainer.classList.contains("active")) {
      refreshOpenHeights();
    }
  });
  observer.observe(galleryContainer, { attributes: true, attributeFilter: ["class"] });

  async function handleEntry(entry, categoryPath) {
    const targetPath = path.join(categoryPath, entry.name);

    if (entry.isFile) {
      const fileObj = await new Promise((resolve, reject) => entry.file(resolve, reject));
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      ipcRenderer.send("import-file", categoryPath, fileObj.path);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      for (const e of entries) {
        await handleEntry(e, targetPath);
      }
    }
  }

  galleryContainer.addEventListener("dragover", e => {
    e.preventDefault();

    if (isOnImport(e.target)) {
      galleryContainer.classList.remove("drag-over");
      return;
    }

    if (!isOnImport(e.target)) galleryContainer.classList.add("drag-over");
  });

  galleryContainer.addEventListener("dragleave", e => {
    e.preventDefault();
    if (!isOnImport(e.relatedTarget)) galleryContainer.classList.remove("drag-over");
  });

  galleryContainer.addEventListener("drop", async e => {
    e.preventDefault();
    galleryContainer.classList.remove("drag-over");

    if (!e.dataTransfer?.items?.length) return;

    const items = [...e.dataTransfer.items];
    const importBtn = e.target.closest(".import-button");
    const categoryPath = importBtn ? importBtn.closest(".category").dataset.path : galleryFolderPath;

    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (!entry) continue;

      if (entry.isDirectory) {
        if (importBtn) {
          alert("Cannot import a folder into a category. Drop it into the root instead.");
          continue;
        }
        await handleEntry(entry, categoryPath);
      } else {
        await handleEntry(entry, categoryPath);
      }
    }
  });

  ipcRenderer.on("gallery-list", (event, categories) => {
    galleryContainer.innerHTML = "";
    categoriesMeta = [];
    const savedStates = getSavedCategoryStates();

    if (!categories.length) {
      galleryContainer.innerHTML = "<div>No content found in gallery. Drag and drop folders/files to import.</div>";
      return;
    }

    categories.forEach(category => {
      const categoryEl = document.createElement("div");
      categoryEl.classList.add("category");
      categoryEl.dataset.path = category.path;

      const header = document.createElement("div");
      header.classList.add("header");
      header.style.cursor = "pointer";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.userSelect = "none";
      header.innerHTML = `
        <div class="divider"></div>
        <span>${category.name.toUpperCase()}</span>
        <i class="fas fa-angle-down" style="transition: 0.2s ease;"></i>
        <div class="divider"></div>
      `;

      const contentWrapper = document.createElement("div");
      contentWrapper.classList.add("category-content");
      contentWrapper.style.overflow = "hidden";

      const btnContainer = document.createElement("div");
      btnContainer.classList.add("category-buttons");
      btnContainer.style.display = "flex";
      btnContainer.style.alignItems = "center";
      btnContainer.style.gap = "1rem";
      btnContainer.style.marginBottom = "1rem";

      const openFolderBtn = document.createElement("div");
      openFolderBtn.classList.add("juice-button");
      openFolderBtn.id = `open-folder-btn-${category.name}`;
      openFolderBtn.innerHTML = `<span><i class="fas fa-folder-open"></i> Open Folder</span>`;
      openFolderBtn.addEventListener("click", () => {
        ipcRenderer.send("open-category-folder", category.path);
      });

      const importBtn = document.createElement("div");
      importBtn.classList.add("juice-button", "import-button");
      importBtn.id = `import-btn-${category.name}`;
      importBtn.innerHTML = `<span>Import</span><div class="description">Or drag and drop</div>`;
      importBtn.addEventListener("click", () => {
        ipcRenderer.send("open-import", category.path);
      });

      importBtn.addEventListener("dragover", e => {
        e.preventDefault();
        importBtn.classList.add("drag-over");
      });
      importBtn.addEventListener("dragleave", e => {
        e.preventDefault();
        importBtn.classList.remove("drag-over");
      });
      importBtn.addEventListener("drop", e => {
        e.preventDefault();
        importBtn.classList.remove("drag-over");

        const droppedFile = e.dataTransfer.files[0];
        if (!droppedFile) return;
        ipcRenderer.send("import-file", category.path, droppedFile.path);
      });

      btnContainer.appendChild(openFolderBtn);
      btnContainer.appendChild(importBtn);
      contentWrapper.appendChild(btnContainer);

      const fileList = document.createElement("div");
      fileList.classList.add("option-group");
      fileList.style.display = "flex";
      fileList.style.flexDirection = "column";

      if (!category.files.length) {
        const empty = document.createElement("div");
        empty.textContent = "No files in this category.";
        fileList.appendChild(empty);
      } else {
        category.files.forEach(file => {
          const fileEl = document.createElement("div");
          fileEl.classList.add("option");
          fileEl.style.display = "flex";
          fileEl.style.alignItems = "center";
          fileEl.style.marginBottom = "5px";

          const ext = file.name.split(".").pop().toLowerCase();
          let imgPreview = null;
          if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
            imgPreview = document.createElement("canvas");
            imgPreview.width = 64;
            imgPreview.height = 64;
            imgPreview.style.width = "64px";
            imgPreview.style.height = "64px";
            imgPreview.style.marginRight = "10px";

            ipcRenderer.invoke("get-file-preview", file.path).then(dataUrl => {
              const img = new Image();
              img.onload = () => {
                const ctx = imgPreview.getContext("2d");
                const scale = Math.min(64 / img.width, 64 / img.height);
                const x = (64 - img.width * scale) / 2;
                const y = (64 - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
              };
              img.src = dataUrl;

              imgPreview.addEventListener("click", (e) => {
                e.stopPropagation();
                ipcRenderer.invoke("get-file-preview", file.path).then(originalDataUrl => {
                  openLightbox(originalDataUrl, 0);
                });
              });
            });
          }

          const nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.value = file.name;
          nameInput.style.flex = "1";
          nameInput.style.marginRight = "10px";
          nameInput.addEventListener("change", () => {
            const newName = nameInput.value.trim();
            if (!newName) return;
            ipcRenderer.send("rename-file", file.path, newName);
          });

          const copyBtn = document.createElement("button");
          copyBtn.classList.add("juice-button");
          copyBtn.innerHTML = `<i class="fas fa-copy"></i>`;
          copyBtn.addEventListener("click", () => {
            if (["txt", "json", "css"].includes(ext)) {
              ipcRenderer.send("copy-file-content", file.path);
            } else {
              ipcRenderer.send("copy-image-path", file.path);
            }
          });

          const folderBtn = document.createElement("button");
          folderBtn.classList.add("juice-button");
          folderBtn.innerHTML = `<i class="fas fa-folder-open"></i>`;
          folderBtn.addEventListener("click", () => {
            ipcRenderer.send("open-file", file.path);
          });

          const deleteBtn = document.createElement("button");
          deleteBtn.classList.add("juice-button");
          deleteBtn.innerHTML = `<i class="fas fa-trash"></i>`;
          deleteBtn.addEventListener("click", () => {
            if (confirm(`Delete "${file.name}"?`)) {
              ipcRenderer.send("delete-file", file.path);
            }
          });

          fileEl.appendChild(nameInput);
          if (imgPreview) fileEl.appendChild(imgPreview);
          fileEl.appendChild(folderBtn);
          fileEl.appendChild(copyBtn);
          fileEl.appendChild(deleteBtn);
          fileList.appendChild(fileEl);
        });
      }

      contentWrapper.appendChild(fileList);
      categoryEl.appendChild(header);
      categoryEl.appendChild(contentWrapper);

      const arrowIcon = header.querySelector(".fa-angle-down");
      categoriesMeta.push({ contentWrapper, arrowIcon, categoryPath: category.path });

      header.addEventListener("click", () => {
        const currentlyOpen = contentWrapper.style.maxHeight !== "0px";
        const newState = !currentlyOpen;

        if (newState) {
          contentWrapper.style.maxHeight = contentWrapper.scrollHeight + "px";
          contentWrapper.style.opacity = "1";
          arrowIcon.style.transform = "rotate(0deg)";
        } else {
          contentWrapper.style.maxHeight = "0";
          contentWrapper.style.opacity = "0";
          arrowIcon.style.transform = "rotate(-90deg)";
        }

        saveCategoryState(category.path, newState);
      });

      galleryContainer.appendChild(categoryEl);
    });

    requestAnimationFrame(() => refreshOpenHeights());
  });

  ipcRenderer.on("file-content-copied", () => {
    alert("File content copied to clipboard!");
  });
  ipcRenderer.on("image-path-copied", () => {
    alert("File path copied to clipboard!");
  });
  ipcRenderer.on("gallery-updated", () => loadGallery());

  loadGallery();
};

module.exports = { initGallery };