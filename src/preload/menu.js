const { shell, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { version } = require("../../package.json");
const { addOpenerList } = require("../addons/chestOpener");
const { initBrowser } = require("../addons/browser");

class Menu {
  constructor() {
    this.settings = ipcRenderer.sendSync("get-settings");
    this.menuCSS = fs.readFileSync(path.join(__dirname, "../assets/css/menu.css"), "utf8");
    this.menuHTML = fs.readFileSync(path.join(__dirname, "../assets/html/menu.html"), "utf8");
    this.menu = this.createMenu();
    this.localStorage = window.localStorage;
    this.menuToggle = this.menu.querySelector(".menu");
    this.tabToContentMap = {
      ui: this.menu.querySelector("#ui-options"),
      game: this.menu.querySelector("#game-options"),
      browse: this.menu.querySelector("#browse-options"),
      community: this.menu.querySelector("#community-options"),
      css: this.menu.querySelector("#css-options"),
      sounds: this.menu.querySelector("#sounds-options"),
      textures: this.menu.querySelector("#textures-options"),
      crosshairs: this.menu.querySelector("#crosshairs-options"),
      skyboxes: this.menu.querySelector("#skyboxes-options"),
      killicons: this.menu.querySelector("#killicons-options"),
      maps: this.menu.querySelector("#maps-options"),
      gallery: this.menu.querySelector("#gallery-options"),
      performance: this.menu.querySelector("#performance-options"),
      client: this.menu.querySelector("#client-options"),
      scripts: this.menu.querySelector("#scripts-options"),
      about: this.menu.querySelector("#about-client"),
      changelogs: this.menu.querySelector("#client-changelogs"),
    };
  }

  createMenu() {
    const menu = document.createElement("div");
    menu.innerHTML = this.menuHTML;
    menu.id = "juice-menu";
    menu.style.cssText = "z-index: 99999999; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);";
    const menuCSS = document.createElement("style");
    menuCSS.innerHTML = this.menuCSS;
    menu.prepend(menuCSS);
    document.body.appendChild(menu);
    return menu;
  }

  init() {
    this.setVersion();
    this.setUser();
    this.setKeybind();
    this.dragMenu();
    this.setLocalGradient();
    this.setLocalBadges();
    this.setLocalProfileBackground();
    this.setTheme();
    this.handleKeyEvents();
    this.initMenu();
    this.initChangelogs();
    this.convertOldConfig();
    this.initWeaponCustomizations();
    this.handleSliderInputs();
    this.handleColorInputs();
    this.handleMenuKeybindChange();
    this.handleInspectKeybindChange();
    this.handleMenuInputChanges();
    this.handleMenuSelectChanges();
    this.handleTabChanges();
    this.handleInnerTabChanges();
    this.handleSelectorChanges();
    this.handleDropdowns();
    this.handleAppearance();
    this.handleSearch();
    this.handleButtons();
    this.handleInfoTooltips();
    this.handleQuickCSS();

    initBrowser(this.menu);

    const savedTab = this.localStorage.getItem("juice-menu-tab");
    const tabEl = savedTab ? this.menu.querySelector(`[data-tab="${savedTab}"]`) : null;
    this.handleTabChange(tabEl ?? this.menu.querySelector(".juice.tab"));

    const savedParentTab = this.localStorage.getItem("juice-menu-tab");

    const savedInnerTab = this.localStorage.getItem(`juice-menu-inner-tab-${savedParentTab}`);
    const innerTabEl = savedInnerTab ? this.menu.querySelector(`[data-tab="${savedInnerTab}"]`) : null;
    this.handleInnerTabChange(innerTabEl ?? this.menu.querySelector(".juice.inner-tab"));

    const savedSelector = this.localStorage.getItem("juice-menu-selector");
    const selectorEl = savedSelector ? this.menu.querySelector(`[data-selector="${savedSelector}"]`) : null;
    this.handleSelectorChange(selectorEl ?? this.menu.querySelector(".juice.selector"));
  }

  setVersion() {
    this.menu.querySelectorAll(".ver").forEach((element) => {
      element.innerText = `v${version}`;
    });
  }

  setUser() {
    const user = JSON.parse(this.localStorage.getItem("current-user"));
    if (user) {
      this.menu.querySelector(".user").innerText = `${user.name}#${user.shortId}`;
    }
  }

  setKeybind() {
    this.menu.querySelector(".keybind").innerText = `Press ${this.settings.menu_keybind} to toggle menu`;
    if (!this.localStorage.getItem("juice-menu")) {
      this.localStorage.setItem("juice-menu", this.menuToggle.getAttribute("data-active"));
    } else {
      this.menuToggle.setAttribute("data-active", this.localStorage.getItem("juice-menu"));
    }
  }

  dragMenu() {
    const menu = document.querySelector(".menu");
    const titlebar = menu.querySelector(".menu-titlebar");

    let isDragging = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startMenuX = 0;
    let startMenuY = 0;
    let savedTransition = "";

    function setMenuPosition(x, y) {
      menu.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function getMenuPosition() {
      const transform = getComputedStyle(menu).transform;
      if (transform && transform !== "none") {
        const values = transform.match(/matrix.*\((.+)\)/)[1].split(",");
        return {
          x: parseFloat(values[4]) || 0,
          y: parseFloat(values[5]) || 0,
        };
      }
      return { x: 0, y: 0 };
    }

    function centerMenu() {
      const x = 0 - menu.offsetWidth / 2;
      const y = 0 - menu.offsetHeight / 2;
      setMenuPosition(x, y);
    }

    window.addEventListener("load", () => {
      const savedPos = localStorage.getItem("menu-position");
      if (savedPos) {
        try {
          const { x, y } = JSON.parse(savedPos);
          setMenuPosition(x, y);
        } catch {
          centerMenu();
        }
      } else {
        centerMenu();
      }
    });

    titlebar.addEventListener("mousedown", (e) => {
      isDragging = true;

      savedTransition = menu.style.transition;
      menu.style.transition = "none";

      const pos = getMenuPosition();
      startMenuX = pos.x;
      startMenuY = pos.y;

      startMouseX = e.clientX;
      startMouseY = e.clientY;

      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;

      setMenuPosition(startMenuX + dx, startMenuY + dy);
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        const pos = getMenuPosition();
        localStorage.setItem("menu-position", JSON.stringify(pos));
      }
      isDragging = false;

      menu.style.transition = savedTransition;

      document.body.style.userSelect = "";
    });

    window.addEventListener("resize", () => {
      const pos = getMenuPosition();
      const maxX = window.innerWidth - menu.offsetWidth;
      const maxY = window.innerHeight - menu.offsetHeight;
      if (pos.x > maxX || pos.y > maxY || pos.x < -menu.offsetWidth || pos.y < -menu.offsetHeight) {
        centerMenu();
      }
    });
  }

  setLocalGradient() {
    const self = this;

    setTimeout(() => {
      const colorsContainer = document.querySelector(".custom_gradient .content .colors");
      const addButton = colorsContainer.querySelector(".add-color-btn");
      const rotationSlider = document.getElementById("local_gradient_rotation");
      const rotationInput = document.querySelector(".rotation-value");
      const animatedCheckbox = document.getElementById("local_animated_gradient");
      const shadowSlider = document.getElementById("local_gradient_shadow");
      const shadowInput = document.querySelector(".shadow-value");
      const shadowHexInput = document.querySelector(".option.shadow-color .color-input .hex");
      const shadowColorPicker = document.querySelector(".option.shadow-color .color-input .color-picker");
      const shadowColorInputDiv = document.querySelector(".option.shadow-color .color-input");

      function createSwatch(colorPicker, hex = "#ffffff") {
        const wrapper = document.createElement("div");
        wrapper.className = "color-swatch-wrapper";

        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.background = hex;
        swatch.onclick = () => colorPicker.click();

        wrapper.append(colorPicker, swatch);
        return wrapper;
      }

      const previewDiv = document.createElement("div");
      previewDiv.className = "gradient-preview";

      const nicknameElem = document.querySelector(".team-section .nickname");
      const nicknameText = nicknameElem ? nicknameElem.innerHTML : "";

      previewDiv.innerHTML = `
        <span class="preview-text">${nicknameText}</span>
        <div class="preview-css-wrapper">
          <textarea class="preview-css-label" rows="2" spellcheck="false"></textarea>
        </div>
      `;

      if (!nicknameElem) {
        window.addEventListener("DOMContentLoaded", () => {
          const delayedNickname = document.querySelector(".team-section .nickname");
          const textSpan = previewDiv.querySelector(".preview-text");
          if (delayedNickname && textSpan) {
            textSpan.innerHTML = delayedNickname.innerHTML;
          }
        });
      }

      const previewText = previewDiv.querySelector(".preview-text");
      const previewCssLabel = previewDiv.querySelector(".preview-css-label");

      previewCssLabel.addEventListener("input", () => {
        const lines = previewCssLabel.value.split("\n").map((l) => l.trim());
        const gradientLine = lines.find((l) => l.startsWith("linear-gradient"));
        const shadowLine = lines.find((l) => l.startsWith("text-shadow:"));
        const animatedLine = lines.find((l) => l.startsWith("animated:"));

        if (gradientLine) {
          const match = gradientLine.match(/linear-gradient\(([^)]+)\)/);
          if (match) {
            try {
              previewText.style.backgroundImage = `linear-gradient(${match[1]})`;
              const parts = match[1].split(",").map((s) => s.trim());
              const rotMatch = parts[0].match(/^(\d+)deg$/);
              if (rotMatch) {
                rotationSlider.value = rotMatch[1];
                rotationInput.value = rotMatch[1];
              }
              const stops = parts.slice(rotMatch ? 1 : 0);
              const inputs = [...colorsContainer.querySelectorAll(".color-input")];
              stops.forEach((stop, i) => {
                const m = stop.match(/(#[0-9a-fA-F]{6})\s*([\d.]+%)?/);
                if (!m || !inputs[i]) return;
                inputs[i].querySelector(".hex").value = m[1];
                inputs[i].querySelector(".position").value = m[2] || "";
                inputs[i].querySelector(".color-picker").value = m[1];
                inputs[i].querySelector(".color-swatch").style.background = m[1];
              });
            } catch (e) { }
          }
        }

        if (shadowLine) {
          const val = shadowLine.replace("text-shadow:", "").trim();
          if (val === "none") {
            shadowSlider.value = 0;
            shadowInput.value = 0;
          } else {
            const m = val.match(/0 0 (\d+)px\s+(#[0-9a-fA-F]{6})/);
            if (m) {
              shadowSlider.value = m[1];
              shadowInput.value = m[1];
              shadowColorPicker.value = m[2];
              shadowHexInput.value = m[2];
              const swatch = shadowColorInputDiv.querySelector(".color-swatch");
              if (swatch) swatch.style.background = m[2];
            }
          }
          updateTextShadow();
        }

        if (animatedLine) {
          const isAnimated = animatedLine.replace("animated:", "").trim() === "true";
          animatedCheckbox.checked = isAnimated;
          if (isAnimated) {
            previewText.style.backgroundSize = "200% 200%";
            previewText.style.animation = "animated-gradient 3s linear infinite";
          } else {
            previewText.style.backgroundSize = "";
            previewText.style.animation = "";
          }
        }

        saveToCustomizations();
      });

      if (self.settings.local_animated_gradient) {
        previewText.style.backgroundSize = "200% 200%";
        previewText.style.animation = "animated-gradient 3s linear infinite";
      }

      const toolbar = document.createElement("div");
      toolbar.className = "gradient-toolbar";

      const infoWrapper = document.createElement("div");
      infoWrapper.className = "info-wrapper";
      infoWrapper.innerHTML = `
        <div class="info-btn">?</div>
        <div class="info-tooltip">
          <b style="color:#fff; display:block; margin-bottom:6px;">How to use</b>
          - You will need 2 colors at minimum<br>
          - The colors have to be ordered correctly according to their position from top (0%) to bottom (100%)<br>
          - Leave positions blank to distribute them automatically<br>
          - For a smooth animated gradient put your starting color at the end aswell
        </div>
      `;

      infoWrapper.querySelector(".info-btn").onmouseenter = () => (infoWrapper.querySelector(".info-tooltip").style.display = "block");
      infoWrapper.querySelector(".info-btn").onmouseleave = () => (infoWrapper.querySelector(".info-tooltip").style.display = "none");

      const examples = [
        {
          name: "Sunrise",
          stops: ["#ff512f", "#f09819", "#ff512f"],
          shadow: { intensity: 35, color: "#f07a19" },
        },
        {
          name: "Aqua Marine",
          stops: ["#1a2980", "#26d0ce", "#1a2980"],
          shadow: { intensity: 30, color: "#1289A7" },
        },
        {
          name: "Aurora",
          stops: ["#6c5ce7", "#a29bfe", "#fd79a8", "#fdcb6e", "#6c5ce7"],
          shadow: { intensity: 40, color: "#a29bfe" },
        },
        {
          name: "Monte Carlo",
          stops: ["#cc95c0", "#dbd4b4", "#7aa1d2", "#cc95c0"],
          shadow: { intensity: 35, color: "#ffd200" },
        },
        {
          name: "Hazel",
          stops: ["#77a1d3", "#79cbca", "#e684ae", "#77a1d3"],
          shadow: { intensity: 40, color: "#79cbca" },
        },
      ];

      const examplesWrapper = document.createElement("div");
      examplesWrapper.className = "examples-wrapper";

      const examplesBtn = document.createElement("span");
      examplesBtn.className = "examples-btn";
      examplesBtn.textContent = "Presets";

      const examplesMenu = document.createElement("div");
      examplesMenu.className = "examples-menu";

      examples.forEach((ex) => {
        const item = document.createElement("div");
        item.className = "examples-menu-item";

        const dot = document.createElement("span");
        dot.className = "preset-dot";
        dot.style.background = `linear-gradient(90deg, ${ex.stops.join(", ")})`;

        item.append(dot, document.createTextNode(ex.name));
        item.onclick = () => {
          colorsContainer.querySelectorAll(".color-input").forEach((el) => el.remove());
          ex.stops.forEach((hex) => {
            colorsContainer.insertBefore(createColorInput(hex, ""), addButton);
          });
          rotationSlider.value = 90;
          rotationInput.value = 90;
          if (ex.shadow) {
            shadowSlider.value = ex.shadow.intensity;
            shadowInput.value = ex.shadow.intensity;
            shadowColorPicker.value = ex.shadow.color;
            shadowHexInput.value = ex.shadow.color;
            const swatch = shadowColorInputDiv.querySelector(".color-swatch");
            if (swatch) swatch.style.background = ex.shadow.color;
            updateTextShadow();
          }
          updateGradient();
          examplesMenu.style.display = "none";
        };
        examplesMenu.appendChild(item);
      });

      examplesBtn.onclick = () => {
        examplesMenu.style.display = examplesMenu.style.display === "none" ? "block" : "none";
      };
      document.addEventListener(
        "click",
        (e) => {
          if (!examplesWrapper.contains(e.target)) {
            examplesMenu.style.display = "none";
          }
        },
        true,
      );

      examplesWrapper.append(examplesBtn, examplesMenu);

      const distributeBtn = document.createElement("span");
      distributeBtn.className = "distribute-btn";
      distributeBtn.textContent = "Distribute Evenly";
      distributeBtn.onclick = () => {
        const inputs = colorsContainer.querySelectorAll(".color-input");
        const count = inputs.length;
        inputs.forEach((inp, i) => {
          const pos = count === 1 ? 0 : Math.round((i / (count - 1)) * 100);
          inp.querySelector(".position").value = pos + "%";
        });
        updateGradient();
      };

      toolbar.append(infoWrapper, examplesWrapper, distributeBtn);

      const contentDiv = document.querySelector(".custom_gradient .content");
      const rotationOption = contentDiv.querySelector(".option.rotation");
      rotationOption.parentElement.insertBefore(previewDiv, colorsContainer);
      colorsContainer.parentElement.insertBefore(toolbar, colorsContainer);

      function createColorInput(hex = "#ffffff", position = "") {
        const div = document.createElement("div");
        div.className = "color-input";

        const handle = document.createElement("i");
        handle.className = "fas fa-grip-vertical drag-handle";
        handle.draggable = true;

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.value = hex;
        colorPicker.className = "color-picker";

        const swatchWrapper = createSwatch(colorPicker, hex);
        const swatch = swatchWrapper.querySelector(".color-swatch");

        const hexInput = document.createElement("input");
        hexInput.type = "text";
        hexInput.className = "hex";
        hexInput.placeholder = "#ffffff";
        hexInput.maxLength = 7;
        hexInput.value = hex;

        const posInput = document.createElement("input");
        posInput.type = "text";
        posInput.className = "position";
        posInput.placeholder = "auto";
        posInput.maxLength = 4;
        posInput.value = position;
        posInput.title = "Stop position (e.g. 50%). Leave blank to auto-distribute.";

        const trash = document.createElement("i");
        trash.className = "fas fa-trash remove-color";

        trash.addEventListener("click", () => {
          div.remove();
          updateGradient();
        });

        hexInput.addEventListener("input", () => {
          if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
            colorPicker.value = hexInput.value;
            swatch.style.background = hexInput.value;
            updateGradient();
          }
        });

        colorPicker.addEventListener("input", () => {
          hexInput.value = colorPicker.value.toUpperCase();
          swatch.style.background = colorPicker.value;
          updateGradient();
        });

        animatedCheckbox.addEventListener("click", updateGradient);

        posInput.addEventListener("input", updateGradient);

        div.append(handle, swatchWrapper, hexInput, posInput, trash);
        return div;
      }

      let dragSrcEl = null;

      colorsContainer.addEventListener("dragstart", (e) => {
        const item = e.target.closest(".color-input");
        if (!item) return;
        dragSrcEl = item;
        e.dataTransfer.effectAllowed = "move";
        const blank = document.createElement("canvas");
        blank.width = 1;
        blank.height = 1;
        e.dataTransfer.setDragImage(blank, 0, 0);
        setTimeout(() => item.classList.add("dragging"), 0);
      });

      colorsContainer.addEventListener("dragend", () => {
        dragSrcEl?.classList.remove("dragging");
        colorsContainer.querySelectorAll(".color-input").forEach((el) => el.classList.remove("drag-over"));
        dragSrcEl = null;
      });

      colorsContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const target = e.target.closest(".color-input");
        if (!target || target === dragSrcEl) return;
        colorsContainer.querySelectorAll(".color-input").forEach((el) => el.classList.remove("drag-over"));
        target.classList.add("drag-over");
      });

      colorsContainer.addEventListener("drop", (e) => {
        e.preventDefault();
        const target = e.target.closest(".color-input");
        if (!target || !dragSrcEl || target === dragSrcEl) return;
        const items = [...colorsContainer.querySelectorAll(".color-input")];
        const srcIdx = items.indexOf(dragSrcEl);
        const tgtIdx = items.indexOf(target);
        colorsContainer.insertBefore(dragSrcEl, srcIdx < tgtIdx ? target.nextSibling : target);
        colorsContainer.querySelectorAll(".color-input").forEach((el) => el.classList.remove("drag-over"));
        updateGradient();
      });

      function getStops() {
        const inputs = colorsContainer.querySelectorAll(".color-input");
        const count = inputs.length;
        return [...inputs].map((input, i) => {
          const hex = input.querySelector(".hex").value || "#ffffff";
          const rawPos = input.querySelector(".position").value.trim();
          const pos = rawPos || `${count === 1 ? 0 : Math.round((i / (count - 1)) * 100)}%`;
          return { hex, pos };
        });
      }

      function updateGradient() {
        const rotation = rotationSlider.value || 90;
        const stops = getStops();
        const gradientCSS = `linear-gradient(${rotation}deg, ${stops.map((s) => `${s.hex} ${s.pos}`).join(", ")})`;
        previewText.style.backgroundImage = gradientCSS;
        const intensity = shadowSlider.value || 0;
        const shadowColor = shadowColorPicker.value || "#FFFFFF";
        const shadowCSS = intensity > 0 ? `0 0 ${intensity}px ${shadowColor}` : "none";
        const animatedVal = animatedCheckbox.checked;
        previewCssLabel.value = `${gradientCSS}\ntext-shadow: ${shadowCSS}\nanimated: ${animatedVal}`;
        localStorage.setItem(
          "gradientSettings",
          JSON.stringify({
            rotation,
            colors: stops.map((s) => ({ hex: s.hex, position: s.pos })),
          }),
        );
        saveToCustomizations();
      }

      function updateTextShadow() {
        const intensity = shadowSlider.value || 0;
        const color = shadowColorPicker.value || "#FFFFFF";
        previewText.style.textShadow = intensity > 0 ? `0 0 ${intensity}px ${color}` : "none";
        localStorage.setItem("gradientShadowSettings", JSON.stringify({ intensity, color }));
        const current = previewCssLabel.value.split("\n")[0];
        const animatedVal = animatedCheckbox.checked;
        const shadowCSS = intensity > 0 ? `0 0 ${intensity}px ${color}` : "none";
        previewCssLabel.value = `${current}\ntext-shadow: ${shadowCSS}\nanimated: ${animatedVal}`;
        saveToCustomizations();
      }

      function mergeLocalCustomizations(globalCustomizations) {
        const shortId = localStorage.getItem("user-id");
        if (!shortId) return globalCustomizations;

        const localStops = getStops().map((s) => s.hex);
        const localBadges = [...document.querySelectorAll(".badge-input")].map((input) => input.querySelector(".badge-url")?.value.trim()).filter(Boolean);
        const localIntensity = shadowSlider.value || 0;
        const localColor = shadowColorPicker.value || "#FFFFFF";
        const localBackground = localStorage.getItem("backgroundSettings") || "";

        const existingIndex = globalCustomizations.findIndex((c) => c.shortId === shortId);
        const localData = {
          shortId,
          gradient: {
            rot: `${rotationSlider.value || 90}deg`,
            stops: localStops,
            shadow: localIntensity > 0 ? `0px 0px ${localIntensity}px ${localColor}` : "none",
          },
          animated: self.settings.local_animated_gradient,
          badges: localBadges,
          "profile-background": localBackground || null,
        };

        if (existingIndex >= 0) {
          globalCustomizations[existingIndex] = {
            ...globalCustomizations[existingIndex],
            ...localData,
          };
        } else if (localStops.length > 0 || localBadges.length > 0 || localBackground) {
          globalCustomizations.push(localData);
        }

        return globalCustomizations;
      }

      function saveToCustomizations() {
        if (!self.settings.local_customizations) return;
        const globalCustomizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
        const merged = mergeLocalCustomizations(globalCustomizations);
        localStorage.setItem("juice-customizations", JSON.stringify(merged));
        if (self.applyCustomizations) self.applyCustomizations();
      }

      function loadGradient() {
        const saved = localStorage.getItem("gradientSettings");
        if (!saved) return;
        const data = JSON.parse(saved);
        rotationSlider.value = data.rotation;
        rotationInput.value = data.rotation;
        data.colors.forEach((color) => {
          colorsContainer.insertBefore(createColorInput(color.hex, color.position), addButton);
        });
        updateGradient();
      }

      function loadShadowSettings() {
        const saved = localStorage.getItem("gradientShadowSettings");
        if (!saved) return;
        const data = JSON.parse(saved);
        shadowSlider.value = data.intensity;
        shadowInput.value = data.intensity;
        shadowColorPicker.value = data.color;
        shadowHexInput.value = data.color;
        const swatch = shadowColorInputDiv.querySelector(".color-swatch");
        if (swatch) swatch.style.background = data.color;
        updateTextShadow();
      }

      addButton.addEventListener("click", () => {
        colorsContainer.insertBefore(createColorInput(), addButton);
        updateGradient();
      });

      rotationSlider.addEventListener("input", () => {
        rotationInput.value = rotationSlider.value;
        updateGradient();
      });
      rotationInput.addEventListener("input", () => {
        const clamped = Math.max(0, Math.min(360, parseInt(rotationInput.value) || 0));
        rotationSlider.value = clamped;
        updateGradient();
      });

      animatedCheckbox.addEventListener("change", () => {
        if (animatedCheckbox.checked) {
          previewText.style.backgroundSize = "200% 200%";
          previewText.style.animation = "animated-gradient 3s linear infinite";
        } else {
          previewText.style.backgroundSize = "";
          previewText.style.animation = "";
        }
        saveToCustomizations();
      });

      shadowSlider.addEventListener("input", () => {
        shadowInput.value = shadowSlider.value;
        updateTextShadow();
      });
      shadowInput.addEventListener("input", () => {
        shadowSlider.value = Math.max(0, Math.min(100, parseInt(shadowInput.value) || 0));
        updateTextShadow();
      });

      shadowHexInput.addEventListener("input", () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(shadowHexInput.value)) {
          updateTextShadow();
        }
      });

      shadowColorPicker.addEventListener("input", () => {
        updateTextShadow();
      });

      const style = document.createElement("style");
      style.textContent = `
        @keyframes animated-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `;
      document.head.appendChild(style);

      loadGradient();
      loadShadowSettings();
    }, 250);
  }

  setLocalBadges() {
    const self = this;
    const badgesContent = document.querySelector(".custom_badges .content .badges");
    const addButton = document.querySelector(".add-badge-btn");

    function createBadgeInput(url = "") {
      const div = document.createElement("div");
      div.className = "badge-input";

      const handle = document.createElement("i");
      handle.className = "fas fa-grip-vertical drag-handle";
      handle.draggable = true;

      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "badge-url";
      urlInput.placeholder = "https://.../.png";
      urlInput.value = url;

      const preview = document.createElement("img");
      preview.className = "badge-preview";
      if (url) {
        if (url.startsWith("/") || url.match(/^[A-Za-z]:\\/)) {
          const filePath = url.replace(/\\/g, "/");
          preview.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
        } else {
          preview.src = url;
        }
      }

      const trash = document.createElement("i");
      trash.className = "fas fa-trash remove-badge";

      trash.addEventListener("click", () => {
        div.remove();
        saveBadges();
      });

      urlInput.addEventListener("input", () => {
        const newUrl = urlInput.value.trim();
        preview.src = newUrl || "";
        preview.onerror = () => (preview.src = "");
        saveBadges();
      });

      div.append(handle, urlInput, preview, trash);
      return div;
    }

    function mergeLocalBadges(globalCustomizations) {
      const shortId = localStorage.getItem("user-id");
      if (!shortId) return globalCustomizations;

      const badges = [...badgesContent.querySelectorAll(".badge-input")].map((input) => input.querySelector(".badge-url").value.trim()).filter(Boolean);

      const existingIndex = globalCustomizations.findIndex((c) => c.shortId === shortId);

      if (existingIndex >= 0) {
        globalCustomizations[existingIndex].badges = badges;
      } else if (badges.length > 0) {
        globalCustomizations.push({ shortId, badges });
      }

      return globalCustomizations;
    }

    function saveBadges() {
      const badges = [...badgesContent.querySelectorAll(".badge-input")].map((input) => input.querySelector(".badge-url").value.trim()).filter(Boolean);

      localStorage.setItem("badgeSettings", JSON.stringify(badges));

      if (!self.settings.local_customizations) return;

      const globalCustomizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
      const merged = mergeLocalBadges(globalCustomizations);
      localStorage.setItem("juice-customizations", JSON.stringify(merged));
      if (self.applyCustomizations) self.applyCustomizations();
    }

    function loadBadges() {
      const saved = localStorage.getItem("badgeSettings");
      if (!saved) return;
      JSON.parse(saved).forEach((url) => {
        badgesContent.insertBefore(createBadgeInput(url), addButton);
      });
      saveBadges();
    }

    let dragSrcEl = null;

    badgesContent.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".badge-input");
      if (!item) return;
      dragSrcEl = item;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => item.classList.add("dragging"), 0);
    });

    badgesContent.addEventListener("dragend", () => {
      dragSrcEl?.classList.remove("dragging");
      badgesContent.querySelectorAll(".badge-input").forEach((el) => el.classList.remove("drag-over"));
      dragSrcEl = null;
    });

    badgesContent.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const target = e.target.closest(".badge-input");
      if (!target || target === dragSrcEl) return;
      badgesContent.querySelectorAll(".badge-input").forEach((el) => el.classList.remove("drag-over"));
      target.classList.add("drag-over");
    });

    badgesContent.addEventListener("drop", (e) => {
      e.preventDefault();
      const target = e.target.closest(".badge-input");
      if (!target || !dragSrcEl || target === dragSrcEl) return;
      const items = [...badgesContent.querySelectorAll(".badge-input")];
      const srcIdx = items.indexOf(dragSrcEl);
      const tgtIdx = items.indexOf(target);
      badgesContent.insertBefore(dragSrcEl, srcIdx < tgtIdx ? target.nextSibling : target);
      badgesContent.querySelectorAll(".badge-input").forEach((el) => el.classList.remove("drag-over"));
      saveBadges();
    });

    addButton.addEventListener("click", () => {
      badgesContent.insertBefore(createBadgeInput(), addButton);
      saveBadges();
    });

    loadBadges();
  }

  setLocalProfileBackground() {
    const self = this;
    const urlInput = document.querySelector(".custom_profile_background .background-url");
    const trash = document.querySelector(".custom_profile_background .remove-background");
    const preview = document.querySelector(".custom_profile_background .background-preview");

    function mergeLocalBackground(globalCustomizations) {
      const shortId = localStorage.getItem("user-id");
      if (!shortId) return globalCustomizations;

      const url = urlInput.value.trim();

      const existingIndex = globalCustomizations.findIndex((c) => c.shortId === shortId);

      if (existingIndex >= 0) {
        globalCustomizations[existingIndex]["profile-background"] = url || null;
      } else if (url) {
        globalCustomizations.push({ shortId, "profile-background": url });
      }

      return globalCustomizations;
    }

    function saveBackground() {
      const url = urlInput.value.trim();

      localStorage.setItem("backgroundSettings", url || "");

      if (!self.settings.local_customizations) return;

      const globalCustomizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
      const merged = mergeLocalBackground(globalCustomizations);
      localStorage.setItem("juice-customizations", JSON.stringify(merged));
      if (self.applyCustomizations) self.applyCustomizations();
    }

    function setUrl(url) {
      urlInput.value = url || "";
      if (url) {
        preview.src = url;
        preview.style.display = "block";
      } else {
        preview.src = "";
        preview.style.display = "none";
      }
    }

    urlInput.addEventListener("input", () => {
      setUrl(urlInput.value.trim());
      preview.onerror = () => {
        preview.src = "";
        preview.style.display = "none";
      };
      saveBackground();
    });

    trash.addEventListener("click", () => {
      setUrl("");
      saveBackground();
    });

    const saved = localStorage.getItem("backgroundSettings");
    if (saved) {
      setUrl(saved);
      saveBackground();
    }
  }

  setTheme() {
    this.menu.querySelector(".menu").setAttribute("data-theme", this.settings.menu_theme);
  }

  handleKeyEvents() {
    document.addEventListener("keydown", (e) => {
      if (e.code === this.settings.menu_keybind) {
        const isActive = this.menuToggle.getAttribute("data-active") === "true";
        if (!isActive) {
          document.exitPointerLock();
        }
        this.menuToggle.setAttribute("data-active", !isActive);
        this.localStorage.setItem("juice-menu", !isActive);
      }
    });
  }

  initMenu() {
    const inputs = this.menu.querySelectorAll("input[data-setting]");
    const textareas = this.menu.querySelectorAll("textarea[data-setting]");
    const selects = this.menu.querySelectorAll("select[data-setting]");
    inputs.forEach((input) => {
      const setting = input.dataset.setting;
      const type = input.type;
      const value = this.settings[setting];
      if (type === "checkbox") {
        input.checked = value;
      } else {
        input.value = value;
      }
    });

    selects.forEach((select) => {
      const setting = select.dataset.setting;
      const value = this.settings[setting];
      select.value = value;
    });

    textareas.forEach((textarea) => {
      const setting = textarea.dataset.setting;
      const value = this.settings[setting];
      textarea.value = value;
    });

    const options = this.menu.querySelectorAll(".option");
    options.forEach((option) => {
      if (!Array.from(option.children).some((child) => child.tagName === "INPUT") && !Array.from(option.children).some((child) => child.tagName === "SELECT")) return;
      option.style.height = "24px";
    });

    const perWeaponOptions = this.menu.querySelectorAll(".per-weapon");
    perWeaponOptions.forEach((option) => (option.title = "Per-Weapon setting"));
  }

  async initChangelogs() {
    const changelogs = await fetch("https://raw.githubusercontent.com/zVipexx/dawn-client/refs/heads/main/changelogs.json").then((res) => res.json());
    const changelogsContent = document.querySelector("#client-changelogs");

    changelogsContent.innerHTML = "";

    changelogs.forEach((changelog, index) => {
      const changelogContainer = document.createElement("div");
      changelogContainer.classList.add("changelog-entry");

      const headerDiv = document.createElement("div");
      headerDiv.classList.add("changelog-header");

      const leftInfo = document.createElement("div");
      leftInfo.classList.add("changelog-left-info");

      const versionWrapper = document.createElement("div");
      versionWrapper.classList.add("changelog-version-wrapper");

      const version = document.createElement("div");
      version.className = "changelog-version";
      version.textContent = `Version: ${changelog.version}`;
      versionWrapper.appendChild(version);

      if (index === 0) {
        const latestTag = document.createElement("span");
        latestTag.className = "changelog-latest-tag";
        latestTag.textContent = "LATEST";
        versionWrapper.appendChild(latestTag);
      }

      const date = document.createElement("div");
      date.className = "changelog-date";
      date.textContent = `Released: ${changelog.date}`;

      leftInfo.appendChild(versionWrapper);
      leftInfo.appendChild(date);

      const githubBtn = document.createElement("a");
      githubBtn.className = "changelog-github-btn";
      githubBtn.target = "_blank";
      let versionNumber = changelog.version;
      if (!versionNumber.startsWith("v")) {
        versionNumber = "v" + versionNumber;
      }
      githubBtn.href = `https://github.com/zVipexx/dawn-client/releases/tag/${versionNumber}`;
      githubBtn.innerHTML = '<i class="fab fa-github"></i>';
      githubBtn.title = `View release on GitHub (${versionNumber})`;

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(githubBtn);

      const content = document.createElement("div");
      content.className = "changelog-body";

      const contentList = document.createElement("ul");

      changelog.changelogs.forEach((item) => {
        const listContent = document.createElement("li");

        const linkRegex = /\[(.*?)\]\((.*?)\)/g;
        let lastIndex = 0;
        let match;
        let hasLinks = false;
        const fragments = [];

        while ((match = linkRegex.exec(item)) !== null) {
          hasLinks = true;
          if (match.index > lastIndex) {
            fragments.push(document.createTextNode(item.substring(lastIndex, match.index)));
          }
          const link = document.createElement("a");
          link.href = match[2];
          link.textContent = match[1];
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          fragments.push(link);
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < item.length) {
          fragments.push(document.createTextNode(item.substring(lastIndex)));
        }

        if (hasLinks) {
          fragments.forEach((fragment) => listContent.appendChild(fragment));
        } else {
          listContent.textContent = item;
        }

        contentList.appendChild(listContent);
      });

      content.appendChild(contentList);
      changelogContainer.appendChild(headerDiv);
      changelogContainer.appendChild(content);
      changelogsContent.appendChild(changelogContainer);
    });
  }

  updateWeaponConfig() {
    const armSelect = document.querySelector("#active-arm");
    const isSingleArmWeapon = this.settings.active_weapon === "revolver" || this.settings.active_weapon === "shark";

    if (isSingleArmWeapon) {
      armSelect.innerHTML = `
        <option value="right">Right Arm</option>
      `;
      if (this.settings.active_arm !== "right") {
        this._lastFreeArm = this.settings.active_arm;
        this.settings.active_arm = "right";
      }
      armSelect.value = "right";
    } else {
      armSelect.innerHTML = `
        <option value="left">Left Arm</option>
        <option value="right">Right Arm</option>
      `;
      if (this._lastFreeArm) {
        this.settings.active_arm = this._lastFreeArm;
        this._lastFreeArm = null;
      }
      armSelect.value = this.settings.active_arm;
    }

    const weaponInputs = this.menu.querySelectorAll("input[data-setting-weapon]");
    weaponInputs.forEach((input) => {
      const setting = `${this.settings.active_weapon}_${input.dataset.settingWeapon}`;
      const value = this.settings[setting];
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const armInputs = this.menu.querySelectorAll("input[data-setting-arm]");
    armInputs.forEach((input) => {
      const setting = `${this.settings.active_weapon}_${this.settings.active_arm}_${input.dataset.settingArm}`;
      const value = this.settings[setting];
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  convertOldConfig() {
    const oldWeaponConfig = this.localStorage.getItem("dawn_weapon_config");
    if (!oldWeaponConfig) return;

    try {
      const raw = oldWeaponConfig.trim();
      if (!raw) return;

      const oldConfig = JSON.parse(raw);

      const WEAPON_KEY_MAP = { rev: "revolver" };
      const settings = oldConfig.settings || {};
      const universal = oldConfig.universalSettings || {};
      const universalLeft = universal.leftArm || {};
      const universalRight = universal.rightArm || {};

      const newConfig = {};

      const set = (key, value, defaultValue) => {
        if (value !== undefined && value !== null && value !== defaultValue) {
          newConfig[key] = value;
        }
      };

      set("weapon_wireframe", oldConfig.weaponWireframe, false);
      set("weapon_color", oldConfig.weaponColorEnabled, false);
      set("weapon_color_hex", oldConfig.weaponColorHex, "#FFFFFF");
      set("weapon_rainbow", oldConfig.weaponRgb, false);

      const writeArm = (prefix, arm) => {
        arm = arm || {};
        set(`${prefix}_size`, arm.size, 1);
        set(`${prefix}_offset_x`, arm.offsetX, 0);
        set(`${prefix}_offset_y`, arm.offsetY, 0);
        set(`${prefix}_offset_z`, arm.offsetZ, 0);
        set(`${prefix}_rotation_x`, arm.rotationX, 0);
        set(`${prefix}_rotation_y`, arm.rotationY, 0);
        set(`${prefix}_rotation_z`, arm.rotationZ, 0);
      };
      const writeArmAppearance = (prefix, arm) => {
        arm = arm || {};
        set(`${prefix}_wireframe`, arm.wireframe, false);
        set(`${prefix}_color`, arm.colorEnabled, false);
        set(`${prefix}_color_hex`, arm.colorHex, "#FFFFFF");
        set(`${prefix}_rainbow`, arm.rgb, false);
      };

      writeArmAppearance("arm", universalLeft);
      writeArmAppearance("right_arm", universalRight);

      for (const [oldKey, cfg] of Object.entries(settings)) {
        if (!cfg || typeof cfg !== "object") continue;

        const name = WEAPON_KEY_MAP[oldKey] || oldKey;
        const leftArm = cfg.leftArm || {};
        const rightArm = cfg.rightArm || {};
        const mirror = cfg.mirrorArm === true;

        set(`${name}_inspect_duration`, cfg.inspectDuration, 750);
        writeArm(`${name}_left_arm`, leftArm);
        writeArm(`${name}_right_arm`, mirror ? leftArm : rightArm);
        set(`${name}_weapon_size`, cfg.size, 1);
        set(`${name}_weapon_offset_x`, cfg.offsetX, 0);
        set(`${name}_weapon_offset_y`, cfg.offsetY, 0);
        set(`${name}_weapon_offset_z`, cfg.offsetZ, 0);
        set(`${name}_weapon_rotation_x`, cfg.rotationX, 0);
        set(`${name}_weapon_rotation_y`, cfg.rotationY, 0);
        set(`${name}_weapon_rotation_z`, cfg.rotationZ, 0);
      }

      for (const key in newConfig) {
        this.settings[key] = newConfig[key];
        ipcRenderer.send("update-setting", key, newConfig[key]);

        const event = new CustomEvent("juice-settings-changed", {
          detail: { setting: key, value: newConfig[key] },
        });
        document.dispatchEvent(event);
      }
      this.updateWeaponConfig();
      this.localStorage.removeItem("dawn_weapon_config");
    } catch (error) {
      alert(error);
    }
  }

  initWeaponCustomizations() {
    const defaultWeaponSettings = {
      weapon_size: 1,
      weapon_offset_x: 0,
      weapon_offset_y: 0,
      weapon_offset_z: 0,
      weapon_rotation_x: 0,
      weapon_rotation_y: 0,
      weapon_rotation_z: 0,
    };

    const defaultArmSettings = {
      arm_size: 1,
      arm_offset_x: 0,
      arm_offset_y: 0,
      arm_offset_z: 0,
      arm_rotation_x: 0,
      arm_rotation_y: 0,
      arm_rotation_z: 0,
    };

    this.updateWeaponConfig();

    document.addEventListener("juice-settings-changed", (e) => {
      if (e.detail.setting === "active_weapon" || e.detail.setting === "active_arm") this.updateWeaponConfig();
    });

    let weaponClickCounter = 0;
    const resetWeaponSettings = document.querySelector("#reset-weapon-settings");
    resetWeaponSettings.addEventListener("click", () => {
      weaponClickCounter++;
      const text = resetWeaponSettings.querySelector(".text");
      const description = resetWeaponSettings.querySelector(".description");
      if (weaponClickCounter === 1) {
        resetWeaponSettings.style.background = "rgba(var(--red), 0.25)";
        text.innerText = "Are you sure?";
        description.innerText = "This will wipe the size, offset and rotation";
      } else if (weaponClickCounter === 2) {
        Object.keys(defaultWeaponSettings).forEach((key) => {
          const setting = `${this.settings.active_weapon}_${key}`;
          const value = defaultWeaponSettings[key];
          this.settings[setting] = value;

          ipcRenderer.send("update-setting", setting, value);
          const event = new CustomEvent("juice-settings-changed", {
            detail: { setting: setting, value: value },
          });
          document.dispatchEvent(event);

          this.updateWeaponConfig();
        });

        resetWeaponSettings.style.background = "rgba(var(--dark), 0.1)";
        text.innerText = "Reset Weapon Settings";
        description.innerText = "This action cannot be undone";
        weaponClickCounter = 0;
      }
    });

    let armClickCounter = 0;
    const resetArmSettings = document.querySelector("#reset-arm-settings");
    resetArmSettings.addEventListener("click", () => {
      armClickCounter++;
      const text = resetArmSettings.querySelector(".text");
      const description = resetArmSettings.querySelector(".description");
      if (armClickCounter === 1) {
        resetArmSettings.style.background = "rgba(var(--red), 0.25)";
        text.innerText = "Are you sure?";
        description.innerText = "This will wipe the size, offset and rotation";
      } else if (armClickCounter === 2) {
        Object.keys(defaultArmSettings).forEach((key) => {
          const setting = `${this.settings.active_weapon}_${this.settings.active_arm}_${key}`;
          const value = defaultArmSettings[key];
          this.settings[setting] = value;

          ipcRenderer.send("update-setting", setting, value);
          const event = new CustomEvent("juice-settings-changed", {
            detail: { setting: setting, value: value },
          });
          document.dispatchEvent(event);

          this.updateWeaponConfig();
        });

        resetArmSettings.style.background = "rgba(var(--dark), 0.1)";
        text.innerText = "Reset Arm Settings";
        description.innerText = "This action cannot be undone";
        armClickCounter = 0;
      }
    });
  }

  handleSliderInputs() {
    const sliderMap = [
      {
        slider: ".inspect-duration",
        input: ".inspect-duration-value",
      },
      {
        slider: ".weapon-size",
        input: ".weapon-size-value",
      },
      {
        slider: ".weapon-offset-x",
        input: ".weapon-offset-x-value",
      },
      {
        slider: ".weapon-offset-y",
        input: ".weapon-offset-y-value",
      },
      {
        slider: ".weapon-offset-z",
        input: ".weapon-offset-z-value",
      },
      {
        slider: ".weapon-rotation-x",
        input: ".weapon-rotation-x-value",
      },
      {
        slider: ".weapon-rotation-y",
        input: ".weapon-rotation-y-value",
      },
      {
        slider: ".weapon-rotation-z",
        input: ".weapon-rotation-z-value",
      },
      {
        slider: ".arm-size",
        input: ".arm-size-value",
      },
      {
        slider: ".arm-offset-x",
        input: ".arm-offset-x-value",
      },
      {
        slider: ".arm-offset-y",
        input: ".arm-offset-y-value",
      },
      {
        slider: ".arm-offset-z",
        input: ".arm-offset-z-value",
      },
      {
        slider: ".arm-rotation-x",
        input: ".arm-rotation-x-value",
      },
      {
        slider: ".arm-rotation-y",
        input: ".arm-rotation-y-value",
      },
      {
        slider: ".arm-rotation-z",
        input: ".arm-rotation-z-value",
      },
      {
        slider: ".range.corner-roundness",
        input: ".value.corner-roundness",
      },
      {
        slider: ".range.menu-opacity",
        input: ".value.menu-opacity",
      },
      {
        slider: ".range.menu-blur",
        input: ".value.menu-blur",
      },
    ];

    sliderMap.forEach(({ slider, input }) => {
      if (!document.querySelector(slider) || !document.querySelector(input)) return;

      document.querySelector(input).value = document.querySelector(slider).value;

      document.querySelector(slider).addEventListener("input", () => {
        document.querySelector(input).value = document.querySelector(slider).value;
      });

      document.querySelector(input).addEventListener("input", () => {
        const val = parseFloat(document.querySelector(input).value);
        if (!isNaN(val)) {
          document.querySelector(slider).value = val;
          document.querySelector(slider).dispatchEvent(new Event("change"));
        }
      });
    });
  }

  handleColorInputs() {
    const colorMap = [
      {
        picker: ".shadow-color .color-picker",
        hex: ".shadow-color .hex",
      },
      {
        picker: ".weapon-color-hex",
        hex: ".weapon-color-hex-value",
      },
      {
        picker: ".arm-color-hex",
        hex: ".arm-color-hex-value",
      },
      {
        picker: ".color-picker.killfeed-color-red",
        hex: ".hex.killfeed-color-red",
      },
      {
        picker: ".color-picker.killfeed-color-blue",
        hex: ".hex.killfeed-color-blue",
      },
      {
        picker: ".color-picker.custom-primary-color",
        hex: ".hex.custom-primary-color",
      },
      {
        picker: ".color-picker.custom-background-color",
        hex: ".hex.custom-background-color",
      },
      {
        picker: ".color-picker.custom-text-color",
        hex: ".hex.custom-text-color",
      },
      {
        picker: ".color-picker.custom-border-color",
        hex: ".hex.custom-border-color",
      },
    ];

    colorMap.forEach(({ picker, hex }) => {
      if (!document.querySelector(picker) || !document.querySelector(hex)) return;

      document.querySelector(picker).addEventListener("input", () => {
        document.querySelector(hex).value = document.querySelector(picker).value.toUpperCase();
      });

      document.querySelector(hex).addEventListener("input", () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(document.querySelector(hex).value)) {
          document.querySelector(picker).value = document.querySelector(hex).value;
        }
      });
    });
  }

  handleMenuKeybindChange() {
    const changeKeybindButton = this.menu.querySelector(".change-keybind.menu");
    changeKeybindButton.innerText = this.settings.menu_keybind;
    changeKeybindButton.addEventListener("click", () => {
      changeKeybindButton.innerText = "Press any key";
      const listener = (e) => {
        this.settings.menu_keybind = e.code;
        changeKeybindButton.innerText = e.code;
        ipcRenderer.send("update-setting", "menu_keybind", e.code);

        const event = new CustomEvent("juice-settings-changed", {
          detail: { setting: "menu_keybind", value: e.code },
        });
        document.dispatchEvent(event);

        this.menu.querySelector(".keybind").innerText = `Press ${this.settings.menu_keybind} to toggle menu`;
        document.removeEventListener("keydown", listener);
      };
      document.addEventListener("keydown", listener);
    });
  }

  handleInspectKeybindChange() {
    const changeInspectButton = this.menu.querySelector(".change-keybind.inspect");
    changeInspectButton.innerText = this.settings.inspect_keybind;
    changeInspectButton.addEventListener("click", () => {
      changeInspectButton.innerText = "Press any key";
      const listener = (e) => {
        let keyCode = e.code;
        if (e.type === "mousedown") {
          switch (e.button) {
            case 3:
              keyCode = "MouseButton4";
              break;
            case 4:
              keyCode = "MouseButton5";
              break;
            default:
              keyCode = `MouseButton${e.button + 1}`;
          }
        }
        this.settings.inspect_keybind = keyCode;
        changeInspectButton.innerText = keyCode;
        ipcRenderer.send("update-setting", "inspect_keybind", keyCode);
        const event = new CustomEvent("juice-settings-changed", {
          detail: { setting: "inspect_keybind", value: keyCode },
        });
        document.dispatchEvent(event);
        document.removeEventListener("keydown", listener);
        document.removeEventListener("mousedown", listener);
      };
      document.addEventListener("keydown", listener);
      document.addEventListener("mousedown", listener);
    });
  }

  handleMenuInputChange(input) {
    const setting = input.dataset.setting;
    const type = input.type;
    let value = type === "checkbox" ? input.checked : type === "range" || type === "number" ? Number(input.value) : input.value;
    this.settings[setting] = value;
    ipcRenderer.send("update-setting", setting, value);
    const event = new CustomEvent("juice-settings-changed", {
      detail: { setting: setting, value: value },
    });
    document.dispatchEvent(event);
  }

  handleMenuWeaponInputChange(input) {
    const setting = this.settings.active_weapon + "_" + input.dataset.settingWeapon;
    let value = input.value;
    this.settings[setting] = value;
    ipcRenderer.send("update-setting", setting, value);
    const event = new CustomEvent("juice-settings-changed", {
      detail: { setting: setting, value: value },
    });
    document.dispatchEvent(event);
  }

  handleMenuArmInputChange(input) {
    const setting = this.settings.active_weapon + "_" + this.settings.active_arm + "_" + input.dataset.settingArm;
    let value = input.value;
    this.settings[setting] = value;
    ipcRenderer.send("update-setting", setting, value);
    const event = new CustomEvent("juice-settings-changed", {
      detail: { setting: setting, value: value },
    });
    document.dispatchEvent(event);
  }

  handleMenuInputChanges() {
    const inputs = this.menu.querySelectorAll("input[data-setting]:not([type='text'])");
    const weaponInputs = this.menu.querySelectorAll("input[data-setting-weapon]");
    const armInputs = this.menu.querySelectorAll("input[data-setting-arm]");
    inputs.forEach((input) => {
      input.addEventListener("input", () => this.handleMenuInputChange(input));
    });
    weaponInputs.forEach((input) => {
      input.addEventListener("input", () => this.handleMenuWeaponInputChange(input));
    });
    armInputs.forEach((input) => {
      input.addEventListener("input", () => this.handleMenuArmInputChange(input));
    });

    const textInputs = this.menu.querySelectorAll("input[data-setting][type='text']");
    const textareas = this.menu.querySelectorAll("textarea[data-setting]");
    textInputs.forEach((input) => {
      input.addEventListener("change", () => this.handleMenuInputChange(input));
    });
    textareas.forEach((textarea) => {
      textarea.addEventListener("change", () => this.handleMenuInputChange(textarea));
    });
  }

  handleMenuSelectChange(select) {
    const setting = select.dataset.setting;
    const value = select.value;
    this.settings[setting] = value;
    ipcRenderer.send("update-setting", setting, value);
    const event = new CustomEvent("juice-settings-changed", {
      detail: { setting: setting, value: value },
    });
    if (setting === "menu_theme") {
      this.setTheme();
    }
    document.dispatchEvent(event);
  }

  handleMenuSelectChanges() {
    const selects = this.menu.querySelectorAll("select[data-setting]");
    selects.forEach((select) => {
      select.addEventListener("change", () => this.handleMenuSelectChange(select));
    });
  }

  handleTabChanges() {
    const tabs = this.menu.querySelectorAll(".juice.tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.handleTabChange(tab));
    });
  }

  handleTabChange(tab) {
    const tabs = this.menu.querySelectorAll(".juice.tab");
    const tabName = tab.dataset.tab;

    this.localStorage.setItem("juice-menu-tab", tabName);

    const contents = [...this.menu.querySelectorAll(".juice.options")].filter((el) => !el.classList.contains("inner"));
    tabs.forEach((tab) => {
      tab.classList.remove("active");
    });
    contents.forEach((content) => {
      content.classList.remove("active");
    });
    tab.classList.add("active");
    this.tabToContentMap[tab.dataset.tab].classList.add("active");
    if (tabName === "scripts") {
      addOpenerList();
    }

    const content = this.menu.querySelector(".content");
    if (tabName === "browse") {
      content.classList.add("browse-community");
    } else {
      content.classList.remove("browse-community");
    }

    const savedInnerTab = this.localStorage.getItem(`juice-menu-inner-tab-${tabName}`);
    if (savedInnerTab) {
      const innerTabEl = this.menu.querySelector(`[data-tab="${savedInnerTab}"]`);
      if (innerTabEl && innerTabEl.closest(".juice.options.active")) {
        this.handleInnerTabChange(innerTabEl);
      }
    }

    const activeInnerTab = this.menu.querySelector(".juice.options.inner.active");
    if (!activeInnerTab || !activeInnerTab.classList.contains("active")) {
      const defaultInnerTab = this.menu.querySelector(".juice.inner-tab");
      if (defaultInnerTab) {
        this.handleInnerTabChange(defaultInnerTab);
      }
    }
  }

  handleInnerTabChanges() {
    const tabs = this.menu.querySelectorAll(".juice.inner-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.handleInnerTabChange(tab));
    });
  }

  handleInnerTabChange(tab) {
    const tabs = this.menu.querySelectorAll(".juice.inner-tab");
    const tabName = tab.dataset.tab;

    const currentParentTab = this.menu.querySelector(".juice.tab.active");
    const parentTabName = currentParentTab ? currentParentTab.dataset.tab : null;

    if (parentTabName) {
      this.localStorage.setItem(`juice-menu-inner-tab-${parentTabName}`, tabName);
    }

    const contents = this.menu.querySelectorAll(".juice.options.inner");
    tabs.forEach((tab) => {
      tab.classList.remove("active");
    });
    contents.forEach((content) => {
      content.classList.remove("active");
    });
    tab.classList.add("active");

    const targetContent = this.menu.querySelector(`#${tabName}-options`);
    if (targetContent) {
      targetContent.classList.add("active");
    }

    const content = this.menu.querySelector(".content");
    content.classList.toggle("browse-community", parentTabName === "browse" && tabName === "community");
  }

  handleSelectorChanges() {
    const selectors = this.menu.querySelectorAll(".juice.selector");
    selectors.forEach((selector) => {
      selector.addEventListener("click", () => this.handleSelectorChange(selector));
    });
  }

  handleSelectorChange(selector) {
    if (!selector || !selector.dataset.selector || !this.tabToContentMap[selector.dataset.selector]) return;
    const selectors = this.menu.querySelectorAll(".juice.selector");
    const selectorName = selector.dataset.selector;

    this.localStorage.setItem("juice-menu-selector", selectorName);

    const contents = this.menu.querySelectorAll(".juice.options");
    selectors.forEach((sel) => {
      sel.classList.remove("active");
    });
    contents.forEach((content) => {
      content.classList.remove("selected");
    });
    selector.classList.add("active");
    this.tabToContentMap[selector.dataset.selector].classList.add("selected");
  }

  handleDropdowns() {
    const dropdowns = this.menu.querySelectorAll(".dropdown");
    dropdowns.forEach((dropdown) => {
      const dropdownTop = dropdown.querySelector(".dropdown .top");
      dropdownTop.addEventListener("click", () => {
        dropdown.classList.toggle("active");
      });
    });
  }

  handleAppearance() {
    function hexToRgb(hex) {
      const num = parseInt(hex.replace("#", ""), 16);
      return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
    }

    const updateCustomTheme = () => {
      const hiddenSettings = document.querySelector("#custom-theme-settings");
      if (this.settings.menu_theme === "custom") hiddenSettings.style.display = "flex";
      else hiddenSettings.style.display = "none";

      this.menuToggle.style.setProperty("--custom-primary", hexToRgb(this.settings.custom_primary_color));
      this.menuToggle.style.setProperty("--custom-dark", hexToRgb(this.settings.custom_background_color));
      this.menuToggle.style.setProperty("--custom-light", hexToRgb(this.settings.custom_text_color));
      this.menuToggle.style.setProperty("--custom-border", hexToRgb(this.settings.custom_border_color));

      this.menuToggle.style.setProperty("--corner-roundness", this.settings.corner_roundness);
      this.menuToggle.style.setProperty("--menu-opacity", this.settings.menu_opacity);
      this.menuToggle.style.setProperty("--menu-blur", this.settings.menu_blur);
    };
    updateCustomTheme();

    document.addEventListener("juice-settings-changed", () => {
      updateCustomTheme();
    });
  }

  handleSearch() {
    const searchInput = this.menu.querySelector(".juice.search");
    const settings = this.menu.querySelectorAll(".option:not(.custom)");

    searchInput.addEventListener("input", () => {
      const searchValue = searchInput.value.toLowerCase();
      settings.forEach((setting) => {
        setting.style.display = setting.textContent.toLowerCase().includes(searchValue) ? "flex" : "none";
        const parent = setting.parentElement;
        if (parent.classList.contains("option-group")) {
          const visibleChildren = Array.from(parent.children).filter((c) => c.style.display === "flex");
          parent.style.display = visibleChildren.length ? "flex" : "none";
        }
      });
    });
  }

  handleButtons() {
    let selectedTradeId = null;
    let chatObserver = null;

    const highlightSelectedTrade = () => {
      if (!selectedTradeId) return;

      const trades = document.querySelectorAll(".servers .trade");
      trades.forEach((trade) => {
        const text = trade.innerText;
        const match = text.match(/\/trade accept (\d+)/);
        if (match && match[1] === selectedTradeId) {
          trade.classList.add("selected");
        }
      });
    };

    const observeChat = () => {
      if (chatObserver) {
        chatObserver.disconnect();
        chatObserver = null;
      }

      const chatContainer = document.querySelector(".servers .chat");
      if (!chatContainer) return;

      const observer = new MutationObserver(() => {
        highlightSelectedTrade();
      });

      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
      });

      highlightSelectedTrade();
    };

    const bodyObserver = new MutationObserver(() => {
      const chatContainer = document.querySelector(".servers .chat");

      if (chatContainer && !chatObserver) {
        observeChat();
      } else if (!chatContainer && chatObserver) {
        chatObserver.disconnect();
        chatObserver = null;
      }
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("click", async (e) => {
      if (this.settings.accept_on_click) {
        const tradeElem = e.target.closest(".servers .trade");
        const tradeButtonElem = e.target.closest(".servers .trade .button");
        if (!tradeElem) return;
        if (tradeButtonElem) return;

        const text = tradeElem.querySelector(".bold").innerText;
        const match = text.match(/\/trade accept (\d+)/);
        if (!match) return;

        const tradeId = match[1];
        selectedTradeId = tradeId;

        tradeElem.classList.add("selected");

        const input = document.querySelector(".servers .chat .input");
        const sendBtn = document.querySelector(".servers .chat .enter");
        if (!input || !sendBtn) return;

        input.value = `/trade accept ${tradeId}`;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        sendBtn.click();

        input.value = "/trade confirm";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    this.menu.querySelectorAll(".copy-code").forEach((copyBtn) => {
      let timer = null;

      copyBtn.addEventListener("click", () => {
        const codeEl = [...copyBtn.parentElement.children].find(
          (el) => el !== copyBtn && el.classList.contains("code")
        );
        if (!codeEl) return;

        navigator.clipboard.writeText(codeEl.textContent);

        clearTimeout(timer);
        copyBtn.classList.remove("fa-copy");
        copyBtn.classList.add("fa-check");
        timer = setTimeout(() => {
          copyBtn.classList.remove("fa-check");
          copyBtn.classList.add("fa-copy");
        }, 1000);
      });
    });

    const loginWithToken = this.menu.querySelector("#login-with-token");
    loginWithToken.addEventListener("click", () => {
      const tokenInput = this.menu.querySelector(".token-input");
      const token = tokenInput.value.replaceAll('"', '').trim();
      if (!token) {
        tokenInput.style.border = "0.1rem solid rgba(255, 0, 0, .5)"
        setTimeout(() => {
          tokenInput.style.border = "0.1rem solid rgba(var(--border))"
        }, 800)
        return;
      };

      this.localStorage.setItem("token", token);
      window.location.reload();
    })

    const openSwapperFolder = this.menu.querySelector("#open-swapper-folder");
    openSwapperFolder.addEventListener("click", () => {
      ipcRenderer.send("open-swapper-folder");
    });

    const openScriptsFolder = this.menu.querySelector("#open-scripts-folder");
    openScriptsFolder.addEventListener("click", () => {
      ipcRenderer.send("open-scripts-folder");
    });

    const openSkinsFolder = this.menu.querySelector("#open-skins-folder");
    openSkinsFolder.addEventListener("click", () => {
      ipcRenderer.send("open-skins-folder");
    });

    const openSoundsFolder = this.menu.querySelector("#open-sounds-folder");
    openSoundsFolder.addEventListener("click", () => {
      ipcRenderer.send("open-sounds-folder");
    });

    const openGalleryFolder = this.menu.querySelector("#open-gallery-folder");
    openGalleryFolder.addEventListener("click", () => {
      ipcRenderer.send("open-gallery-folder");
    });

    const importSettings = this.menu.querySelector("#import-settings");
    importSettings.addEventListener("click", () => {
      const modal = this.createModal("Import settings", "Paste your settings here to import them");

      const bottom = modal.querySelector(".bottom");

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Paste settings here";
      bottom.appendChild(input);

      const confirm = document.createElement("button");
      confirm.innerText = "Confirm";
      confirm.classList.add("juice-button");
      confirm.addEventListener("click", () => {
        try {
          if (!input.value) return;

          const settings = JSON.parse(input.value);
          for (const key in settings) {
            this.settings[key] = settings[key];
            ipcRenderer.send("update-setting", key, settings[key]);

            const event = new CustomEvent("juice-settings-changed", {
              detail: { setting: key, value: settings[key] },
            });
            document.dispatchEvent(event);

            this.initMenu();
          }
          modal.remove();
        } catch (error) {
          console.error("Error importing settings:", error);
        }
      });

      bottom.appendChild(confirm);

      this.menu.querySelector(".menu").appendChild(modal);
    });

    const exportSettings = this.menu.querySelector("#export-settings");
    exportSettings.addEventListener("click", () => {
      const modal = this.createModal("Export settings", "Copy your settings here to export them");

      const bottom = modal.querySelector(".bottom");

      const textarea = document.createElement("textarea");
      textarea.value = JSON.stringify(this.settings, null, 2);
      bottom.appendChild(textarea);

      const copy = document.createElement("button");
      copy.innerText = "Copy";
      copy.classList.add("juice-button");
      copy.addEventListener("click", () => {
        navigator.clipboard.writeText(textarea.value);
      });

      bottom.appendChild(copy);

      this.menu.querySelector(".menu").appendChild(modal);
    });

    const exportWeaponConfig = this.menu.querySelector(".weapon-config.export");
    exportWeaponConfig.addEventListener("click", () => {
      const modal = this.createModal("Export Weapon Config", "Copy your config here to export it");

      const bottom = modal.querySelector(".bottom");

      const weaponConfig = Object.fromEntries(Object.entries(this.settings).filter(([key]) => key.includes("weapon_") || key.includes("arm_") || key.includes("inspect_duration")));

      const textarea = document.createElement("textarea");
      textarea.value = JSON.stringify(weaponConfig, null, 2);
      bottom.appendChild(textarea);

      const copy = document.createElement("button");
      copy.innerText = "Copy";
      copy.classList.add("juice-button");
      copy.addEventListener("click", () => {
        navigator.clipboard.writeText(textarea.value);
      });

      bottom.appendChild(copy);

      this.menu.querySelector(".menu").appendChild(modal);
    });

    const importWeaponConfig = this.menu.querySelector(".weapon-config.import");
    importWeaponConfig.addEventListener("click", () => {
      const modal = this.createModal("Import Weapon Config", "Paste your config here to import it");

      const bottom = modal.querySelector(".bottom");

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Paste config here";
      bottom.appendChild(input);

      const confirm = document.createElement("button");
      confirm.innerText = "Confirm";
      confirm.classList.add("juice-button");
      confirm.addEventListener("click", () => {
        try {
          if (!input.value) return;

          const settings = JSON.parse(input.value);
          for (const key in settings) {
            this.settings[key] = settings[key];
            ipcRenderer.send("update-setting", key, settings[key]);

            const event = new CustomEvent("juice-settings-changed", {
              detail: { setting: key, value: settings[key] },
            });
            document.dispatchEvent(event);

            this.updateWeaponConfig();
          }
          modal.remove();
        } catch (error) {
          console.error("Error importing weapon config:", error);
        }
      });

      bottom.appendChild(confirm);

      this.menu.querySelector(".menu").appendChild(modal);
    });

    let clickCounter = 0;
    const resetJuiceSettings = this.menu.querySelector("#reset-juice-settings");
    resetJuiceSettings.addEventListener("click", () => {
      clickCounter++;
      if (clickCounter === 1) {
        resetJuiceSettings.style.background = "rgba(var(--red), 0.25)";
        const text = resetJuiceSettings.querySelector(".text");
        text.innerText = "Are you sure?";

        const description = resetJuiceSettings.querySelector(".description");
        description.innerText = "This will restart the client and reset all settings. Click again to confirm";
      } else if (clickCounter === 2) {
        ipcRenderer.send("reset-juice-settings");
      }
    });

    const remoteToStaticLinks = this.menu.querySelector("#remote-to-static-links");
    remoteToStaticLinks.addEventListener("click", async () => {
      const localStorageKeys = [
        "SETTINGS___SETTING/CROSSHAIR___SETTING/STATIC_URL___SETTING",
        "SETTINGS___SETTING/SNIPER___SETTING/SCOPE_URL___SETTING",
        "SETTINGS___SETTING/BLOCKS___SETTING/TEXTURE_URL___SETTING",
        "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG1___SETTING",
        "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG2___SETTING",
        "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG3___SETTING",
        "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG4___SETTING",
        "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG5___SETTING",
        "SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG6___SETTING",
      ];

      const juiceKeys = ["css_link", "hitmarker_link", "killicon_link"];

      const encodeImage = async (url) => {
        if (!url || url === "") return "";

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Invalid response: ${response.status}`);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error(`Error fetching or converting ${url}:`, error);
        }
      };

      for (const key of localStorageKeys) {
        const url = localStorage.getItem(key).replace(/"/g, "");
        const data = await encodeImage(url);
        localStorage.setItem(key, data);
      }

      for (const key of juiceKeys) {
        const url = this.settings[key];
        const data = await encodeImage(url);
        this.settings[key] = data;
        ipcRenderer.send("update-setting", key, data);

        const event = new CustomEvent("juice-settings-changed", {
          detail: { setting: key, value: this.settings[key] },
        });
        document.dispatchEvent(event);

        this.initMenu();
      }
    });
  }

  handleInfoTooltips() {
    this.menu.querySelectorAll(".info-wrapper").forEach((wrapper) => {
      wrapper.querySelector(".info-btn").onmouseenter = () => (wrapper.querySelector(".info-tooltip").style.display = "block");
      wrapper.querySelector(".info-btn").onmouseleave = () => (wrapper.querySelector(".info-tooltip").style.display = "none");
    });
  }

  handleQuickCSS() {
    const quickCSSPath = ipcRenderer.sendSync("get-quickcss-path");
    const quickCSSArea = this.menu.querySelector("textarea[data-setting=advanced_css]");

    const customStyles = document.createElement("style");
    customStyles.id = "juice-styles-custom";
    document.head.appendChild(customStyles);

    const updateStyle = () => {
      if (quickCSSArea.value !== this.settings.advanced_css) {
        quickCSSArea.value = this.settings.advanced_css;
      }
      if (this.settings.quickcss_enabled && this.settings.advanced_css) customStyles.innerHTML = this.settings.advanced_css;
      else customStyles.innerHTML = "";
    };

    let lastKnownContent = this.settings.advanced_css || "";

    try {
      lastKnownContent = fs.readFileSync(quickCSSPath, "utf8");
      this.settings.advanced_css = lastKnownContent;
      quickCSSArea.value = lastKnownContent;
    } catch (err) {
      console.error("Failed to read quickCSS file on load:", err);
    }
    updateStyle();

    const saveCSS = (contents) => {
      if (contents === lastKnownContent) return;
      lastKnownContent = contents;
      this.settings.advanced_css = contents;
      try {
        fs.writeFileSync(quickCSSPath, contents, "utf8");
      } catch (err) {
        console.error("Failed to write quickCSS file:", err);
      }
      updateStyle();
    };

    let writeTimeout = null;
    quickCSSArea.addEventListener("input", () => {
      clearTimeout(writeTimeout);
      writeTimeout = setTimeout(() => saveCSS(quickCSSArea.value), 300);
    });

    document.addEventListener("juice-settings-changed", ({ detail }) => {
      if (detail.setting === "advanced_css") {
        saveCSS(detail.value);
        quickCSSArea.value = detail.value;
      } else if (detail.setting === "quickcss_enabled") {
        updateStyle();
      }
    });

    const syncQuickCss = () => {
      let content;
      try {
        content = fs.readFileSync(quickCSSPath, "utf8");
      } catch {
        return;
      }
      if (content === lastKnownContent) return;
      lastKnownContent = content;
      this.settings.advanced_css = content;
      quickCSSArea.value = content;
      updateStyle();
    };

    fs.unwatchFile(quickCSSPath, syncQuickCss);
    fs.watchFile(quickCSSPath, { interval: 300 }, syncQuickCss);

    const importCSSFromFile = this.menu.querySelector(".import-css");
    importCSSFromFile.addEventListener("click", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".css,.txt";
      fileInput.style.display = "none";

      fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        fileInput.remove();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const contents = e.target.result;
          quickCSSArea.value = contents;
          saveCSS(contents);
        };
        reader.readAsText(file);
      });

      document.body.appendChild(fileInput);
      fileInput.click();
    });

    const openInEditor = this.menu.querySelector(".open-css");
    openInEditor.addEventListener("click", () => {
      shell.openPath(quickCSSPath);
    });
  }

  createModal(title, description) {
    const modal = document.createElement("div");
    modal.id = "modal";

    modal.innerHTML = `
    <div class="content">
      <div class="top">
        <span class="title">
          ${title}
          <div class="close">
            <i class="fas fa-times"></i>
          </div>
        </span>
        <span class="description">${description}</span>
      </div>
      <div class="bottom">
      </div>
    </div>
    `;

    const close = modal.querySelector(".close");
    close.addEventListener("click", () => modal.remove());

    modal.addEventListener("click", (e) => {
      if (e.target.id === "modal") modal.remove();
    });

    return modal;
  }
}

module.exports = Menu;
