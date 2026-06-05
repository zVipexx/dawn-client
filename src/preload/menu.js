const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { version } = require("../../package.json");
const { addOpenerList } = require("../addons/opener");
const { initBrowser } = require("../addons/browser");

class Menu {
  constructor() {
    this.settings = ipcRenderer.sendSync("get-settings");
    this.menuCSS = fs.readFileSync(
      path.join(__dirname, "../assets/css/menu.css"),
      "utf8"
    );
    this.menuHTML = fs.readFileSync(
      path.join(__dirname, "../assets/html/menu.html"),
      "utf8"
    );
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
    };
  }

  createMenu() {
    const menu = document.createElement("div");
    menu.innerHTML = this.menuHTML;
    menu.id = "juice-menu";
    menu.style.cssText =
      "z-index: 99999999; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);";
    const menuCSS = document.createElement("style");
    menuCSS.innerHTML = this.menuCSS
    menu.prepend(menuCSS);
    document.body.appendChild(menu);
    return menu;
  }

  init() {
    this.setVersion();
    this.setUser();
    this.setKeybind();
    this.dragMenu();
    this.resizeMenu();
    this.setLocalGradient();
    this.setLocalBadges();
    this.setLocalProfileBackground();
    this.setTheme();
    this.handleKeyEvents();
    this.initMenu();
    this.handleSliderInputs();
    this.handleColorInputs();
    this.handleMenuKeybindChange();
    this.handleMenuInputChanges();
    this.handleMenuSelectChanges();
    this.handleTabChanges();
    this.handleInnerTabChanges();
    this.handleSelectorChanges();
    this.handleDropdowns();
    this.handleSearch();
    this.handleButtons();

    initBrowser(this.menu);

    const savedTab = this.localStorage.getItem("juice-menu-tab");
    const tabEl = savedTab ? this.menu.querySelector(`[data-tab="${savedTab}"]`) : null;
    this.handleTabChange(tabEl ?? this.menu.querySelector(".juice.tab"));

    const savedInnerTab = this.localStorage.getItem("juice-menu-inner-tab");
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
    this.menu.querySelector(
      ".keybind"
    ).innerText = `Press ${this.settings.menu_keybind} to toggle menu`;
    if (!this.localStorage.getItem("juice-menu")) {
      this.localStorage.setItem(
        "juice-menu",
        this.menuToggle.getAttribute("data-active")
      );
    } else {
      this.menuToggle.setAttribute(
        "data-active",
        this.localStorage.getItem("juice-menu")
      );
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
          y: parseFloat(values[5]) || 0
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

  resizeMenu() {
    const menu = document.querySelector(".menu");

    const EDGE = 6;
    const MIN_W = 700;
    const MIN_H = 510;

    let isResizing = false;
    let edges = { left: false, right: false, top: false, bottom: false };
    let startMouseX = 0;
    let startMouseY = 0;
    let startW = 0;
    let startH = 0;
    let startX = 0;
    let startY = 0;
    let savedTransition = "";

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

    function setMenuPosition(x, y) {
      menu.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function saveSize(w, h) {
      localStorage.setItem("menu-size", JSON.stringify({ w, h }));
    }

    function loadSize() {
      try {
        const saved = localStorage.getItem("menu-size");
        if (saved) {
          const { w, h } = JSON.parse(saved);
          if (w >= MIN_W && h >= MIN_H) {
            menu.style.width = `${w}px`;
            menu.style.height = `${h}px`;
          }
        }
      } catch { }
    }

    const handles = [
      { cls: "n", cursor: "n-resize", edges: { top: true } },
      { cls: "s", cursor: "s-resize", edges: { bottom: true } },
      { cls: "e", cursor: "e-resize", edges: { right: true } },
      { cls: "w", cursor: "w-resize", edges: { left: true } },
      { cls: "nw", cursor: "nw-resize", edges: { top: true, left: true } },
      { cls: "ne", cursor: "ne-resize", edges: { top: true, right: true } },
      { cls: "sw", cursor: "sw-resize", edges: { bottom: true, left: true } },
      { cls: "se", cursor: "se-resize", edges: { bottom: true, right: true } },
    ];

    handles.forEach(({ cls, cursor, edges: handleEdges }) => {
      const el = document.createElement("div");
      el.className = `menu-resize-handle menu-resize-${cls}`;
      el.style.cssText = `position:absolute;z-index:10;`;

      if (cls === "n") Object.assign(el.style, { top: `-${EDGE}px`, left: `${EDGE}px`, right: `${EDGE}px`, height: `${EDGE * 2}px`, cursor });
      if (cls === "s") Object.assign(el.style, { bottom: `-${EDGE}px`, left: `${EDGE}px`, right: `${EDGE}px`, height: `${EDGE * 2}px`, cursor });
      if (cls === "e") Object.assign(el.style, { top: `${EDGE}px`, bottom: `${EDGE}px`, right: `-${EDGE}px`, width: `${EDGE * 2}px`, cursor });
      if (cls === "w") Object.assign(el.style, { top: `${EDGE}px`, bottom: `${EDGE}px`, left: `-${EDGE}px`, width: `${EDGE * 2}px`, cursor });
      if (cls === "nw") Object.assign(el.style, { top: `-${EDGE}px`, left: `-${EDGE}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor });
      if (cls === "ne") Object.assign(el.style, { top: `-${EDGE}px`, right: `-${EDGE}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor });
      if (cls === "sw") Object.assign(el.style, { bottom: `-${EDGE}px`, left: `-${EDGE}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor });
      if (cls === "se") Object.assign(el.style, { bottom: `-${EDGE}px`, right: `-${EDGE}px`, width: `${EDGE * 2}px`, height: `${EDGE * 2}px`, cursor });

      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();

        isResizing = true;
        edges = { left: false, right: false, top: false, bottom: false, ...handleEdges };

        savedTransition = menu.style.transition;
        menu.style.transition = "none";

        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startW = menu.offsetWidth;
        startH = menu.offsetHeight;

        const pos = getMenuPosition();
        startX = pos.x;
        startY = pos.y;

        document.body.style.userSelect = "none";
        document.body.style.cursor = cursor;
      });

      menu.appendChild(el);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;

      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;

      if (edges.right) newW = Math.max(MIN_W, startW + dx);
      if (edges.bottom) newH = Math.max(MIN_H, startH + dy);

      if (edges.left) {
        newW = Math.max(MIN_W, startW - dx);
        newX = startX + (startW - newW);
      }

      if (edges.top) {
        newH = Math.max(MIN_H, startH - dy);
        newY = startY + (startH - newH);
      }

      menu.style.width = `${newW}px`;
      menu.style.height = `${newH}px`;
      setMenuPosition(newX, newY);
    });

    document.addEventListener("mouseup", () => {
      if (!isResizing) return;
      isResizing = false;

      menu.style.transition = savedTransition;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      saveSize(menu.offsetWidth, menu.offsetHeight);

      const pos = getMenuPosition();
      localStorage.setItem("menu-position", JSON.stringify(pos));
    });

    window.addEventListener("load", loadSize);
  }

  setLocalGradient() {
    const self = this;

    setTimeout(() => {
      const colorsContainer = document.querySelector(".custom_gradient .content .colors");
      const addButton = colorsContainer.querySelector(".add-color-btn");
      const rotationSlider = document.getElementById('local_gradient_rotation');
      const rotationInput = document.querySelector('.rotation-value');
      const animatedCheckbox = document.getElementById('local_animated_gradient');
      const shadowSlider = document.getElementById('local_gradient_shadow');
      const shadowInput = document.querySelector('.shadow-value');
      const shadowHexInput = document.querySelector('.option.shadow-color .color-input .hex');
      const shadowColorPicker = document.querySelector('.option.shadow-color .color-input .color-picker');
      const shadowColorInputDiv = document.querySelector('.option.shadow-color .color-input');

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

      const previewDiv = document.createElement('div');
      previewDiv.className = 'gradient-preview';

      const nicknameElem = document.querySelector(".team-section .nickname");
      const nicknameText = nicknameElem ? nicknameElem.innerHTML : "";

      previewDiv.innerHTML = `
        <span class="preview-text">${nicknameText}</span>
        <div class="preview-css-wrapper">
          <textarea class="preview-css-label" rows="2" spellcheck="false"></textarea>
        </div>
      `;

      if (!nicknameElem) {
        window.addEventListener('DOMContentLoaded', () => {
          const delayedNickname = document.querySelector(".team-section .nickname");
          const textSpan = previewDiv.querySelector(".preview-text");
          if (delayedNickname && textSpan) {
            textSpan.innerHTML = delayedNickname.innerHTML;
          }
        });
      }

      const previewText = previewDiv.querySelector('.preview-text');
      const previewCssLabel = previewDiv.querySelector('.preview-css-label');

      previewCssLabel.addEventListener('input', () => {
        const lines = previewCssLabel.value.split('\n').map(l => l.trim());
        const gradientLine = lines.find(l => l.startsWith('linear-gradient'));
        const shadowLine = lines.find(l => l.startsWith('text-shadow:'));
        const animatedLine = lines.find(l => l.startsWith('animated:'));

        if (gradientLine) {
          const match = gradientLine.match(/linear-gradient\(([^)]+)\)/);
          if (match) {
            try {
              previewText.style.backgroundImage = `linear-gradient(${match[1]})`;
              const parts = match[1].split(',').map(s => s.trim());
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
          const val = shadowLine.replace('text-shadow:', '').trim();
          if (val === 'none') {
            shadowSlider.value = 0;
            shadowInput.value = 0;
          } else {
            const m = val.match(/0 0 (\d+)px\s+(#[0-9a-fA-F]{6})/);
            if (m) {
              shadowSlider.value = m[1];
              shadowInput.value = m[1];
              shadowColorPicker.value = m[2];
              shadowHexInput.value = m[2];
              const swatch = shadowColorInputDiv.querySelector('.color-swatch');
              if (swatch) swatch.style.background = m[2];
            }
          }
          updateTextShadow();
        }

        if (animatedLine) {
          const isAnimated = animatedLine.replace('animated:', '').trim() === 'true';
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
        previewText.style.animation = 'animated-gradient 3s linear infinite';
      }

      const toolbar = document.createElement('div');
      toolbar.className = 'gradient-toolbar';

      const infoWrapper = document.createElement('div');
      infoWrapper.className = 'info-wrapper';
      infoWrapper.innerHTML = `
        <div class="info-btn">?</div>
        <div class="info-tooltip">
          <b style="color:#fff; display:block; margin-bottom:6px;">How to use</b>
          - You will need 2 colors at minimum<br>
          - The colors have to be ordered correctly according to their position from top (0%) to bottom (100%)<br>
          - Leave positions blank to distribute them automatically
        </div>
      `;
      infoWrapper.querySelector('.info-btn').onmouseenter = () => infoWrapper.querySelector('.info-tooltip').style.display = 'block';
      infoWrapper.querySelector('.info-btn').onmouseleave = () => infoWrapper.querySelector('.info-tooltip').style.display = 'none';

      const examples = [
        { name: "Sunrise", stops: ["#ff512f", "#f09819", "#ff512f"], shadow: { intensity: 35, color: "#f07a19" } },
        { name: "Aqua Marine", stops: ["#1a2980", "#26d0ce", "#1a2980"], shadow: { intensity: 30, color: "#1289A7" } },
        { name: "Aurora", stops: ["#6c5ce7", "#a29bfe", "#fd79a8", "#fdcb6e", "#6c5ce7"], shadow: { intensity: 40, color: "#a29bfe" } },
        { name: "Monte Carlo", stops: ["#cc95c0", "#dbd4b4", "#7aa1d2", "#cc95c0"], shadow: { intensity: 35, color: "#ffd200" } },
        { name: "Hazel", stops: ["#77a1d3", "#79cbca", "#e684ae", "#77a1d3"], shadow: { intensity: 40, color: "#79cbca" } },
      ];

      const examplesWrapper = document.createElement('div');
      examplesWrapper.className = 'examples-wrapper';

      const examplesBtn = document.createElement('span');
      examplesBtn.className = 'examples-btn';
      examplesBtn.textContent = 'Presets';

      const examplesMenu = document.createElement('div');
      examplesMenu.className = 'examples-menu';

      examples.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'examples-menu-item';

        const dot = document.createElement('span');
        dot.className = 'preset-dot';
        dot.style.background = `linear-gradient(90deg, ${ex.stops.join(", ")})`;

        item.append(dot, document.createTextNode(ex.name));
        item.onclick = () => {
          colorsContainer.querySelectorAll(".color-input").forEach(el => el.remove());
          ex.stops.forEach(hex => {
            colorsContainer.insertBefore(createColorInput(hex, ""), addButton);
          });
          rotationSlider.value = 90;
          rotationInput.value = 90;
          if (ex.shadow) {
            shadowSlider.value = ex.shadow.intensity;
            shadowInput.value = ex.shadow.intensity;
            shadowColorPicker.value = ex.shadow.color;
            shadowHexInput.value = ex.shadow.color;
            const swatch = shadowColorInputDiv.querySelector('.color-swatch');
            if (swatch) swatch.style.background = ex.shadow.color;
            updateTextShadow();
          }
          updateGradient();
          examplesMenu.style.display = 'none';
        };
        examplesMenu.appendChild(item);
      });

      examplesBtn.onclick = () => {
        examplesMenu.style.display = examplesMenu.style.display === 'none' ? 'block' : 'none';
      };
      document.addEventListener('click', (e) => {
        if (!examplesWrapper.contains(e.target)) {
          examplesMenu.style.display = 'none';
        }
      }, true);

      examplesWrapper.append(examplesBtn, examplesMenu);

      const distributeBtn = document.createElement('span');
      distributeBtn.className = 'distribute-btn';
      distributeBtn.textContent = 'Distribute Evenly';
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
      const rotationOption = contentDiv.querySelector('.option.rotation');
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

        trash.addEventListener("click", () => { div.remove(); updateGradient(); });

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

        animatedCheckbox.addEventListener("click", updateGradient)

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
        colorsContainer.querySelectorAll(".color-input").forEach(el => el.classList.remove("drag-over"));
        dragSrcEl = null;
      });

      colorsContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const target = e.target.closest(".color-input");
        if (!target || target === dragSrcEl) return;
        colorsContainer.querySelectorAll(".color-input").forEach(el => el.classList.remove("drag-over"));
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
        colorsContainer.querySelectorAll(".color-input").forEach(el => el.classList.remove("drag-over"));
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
        const gradientCSS = `linear-gradient(${rotation}deg, ${stops.map(s => `${s.hex} ${s.pos}`).join(", ")})`;
        previewText.style.backgroundImage = gradientCSS;
        const intensity = shadowSlider.value || 0;
        const shadowColor = shadowColorPicker.value || '#FFFFFF';
        const shadowCSS = intensity > 0 ? `0 0 ${intensity}px ${shadowColor}` : 'none';
        const animatedVal = animatedCheckbox.checked;
        previewCssLabel.value = `${gradientCSS}\ntext-shadow: ${shadowCSS}\nanimated: ${animatedVal}`;
        localStorage.setItem('gradientSettings', JSON.stringify({
          rotation,
          colors: stops.map(s => ({ hex: s.hex, position: s.pos }))
        }));
        saveToCustomizations();
      }

      function updateTextShadow() {
        const intensity = shadowSlider.value || 0;
        const color = shadowColorPicker.value || '#FFFFFF';
        previewText.style.textShadow = intensity > 0 ? `0 0 ${intensity}px ${color}` : 'none';
        localStorage.setItem('gradientShadowSettings', JSON.stringify({ intensity, color }));
        const current = previewCssLabel.value.split('\n')[0];
        const animatedVal = animatedCheckbox.checked;
        const shadowCSS = intensity > 0 ? `0 0 ${intensity}px ${color}` : 'none';
        previewCssLabel.value = `${current}\ntext-shadow: ${shadowCSS}\nanimated: ${animatedVal}`;
        saveToCustomizations();
      }

      function saveToCustomizations() {
        if (!self.settings.local_customizations) return;
        const customizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
        const shortId = localStorage.getItem("user-id");
        const stops = getStops().map(s => s.hex);
        const badges = [...document.querySelectorAll(".badge-input")].map(input => input.querySelector(".badge-url")?.value.trim()).filter(Boolean);
        const intensity = shadowSlider.value || 0;
        const color = shadowColorPicker.value || '#FFFFFF';

        const existingIndex = customizations.findIndex(c => c.shortId === shortId);
        const existing = existingIndex >= 0 ? customizations[existingIndex] : {};

        const userData = {
          ...existing,
          shortId,
          gradient: {
            rot: `${rotationSlider.value || 90}deg`,
            stops,
            shadow: intensity > 0 ? `0px 0px ${intensity}px ${color}` : "none"
          },
          animated: self.settings.local_animated_gradient,
          badges
        };

        if (existingIndex >= 0) {
          customizations[existingIndex] = userData;
        } else {
          customizations.push(userData);
        }

        localStorage.setItem("juice-customizations", JSON.stringify(customizations));
      }

      function loadGradient() {
        const saved = localStorage.getItem('gradientSettings');
        if (!saved) return;
        const data = JSON.parse(saved);
        rotationSlider.value = data.rotation;
        rotationInput.value = data.rotation;
        data.colors.forEach(color => {
          colorsContainer.insertBefore(createColorInput(color.hex, color.position), addButton);
        });
        updateGradient();
      }

      function loadShadowSettings() {
        const saved = localStorage.getItem('gradientShadowSettings');
        if (!saved) return;
        const data = JSON.parse(saved);
        shadowSlider.value = data.intensity;
        shadowInput.value = data.intensity;
        shadowColorPicker.value = data.color;
        shadowHexInput.value = data.color;
        const swatch = shadowColorInputDiv.querySelector('.color-swatch');
        if (swatch) swatch.style.background = data.color;
        updateTextShadow();
      }

      addButton.addEventListener("click", () => {
        colorsContainer.insertBefore(createColorInput(), addButton);
        updateGradient();
      });

      rotationSlider.addEventListener('input', () => { rotationInput.value = rotationSlider.value; updateGradient(); });
      rotationInput.addEventListener('input', () => {
        const clamped = Math.max(0, Math.min(360, parseInt(rotationInput.value) || 0));
        rotationSlider.value = clamped;
        updateGradient();
      });

      animatedCheckbox.addEventListener('change', () => {
        if (animatedCheckbox.checked) {
          previewText.style.backgroundSize = "200% 200%";
          previewText.style.animation = "animated-gradient 3s linear infinite";
        } else {
          previewText.style.backgroundSize = "";
          previewText.style.animation = "";
        }
        saveToCustomizations();
      });

      shadowSlider.addEventListener('input', () => { shadowInput.value = shadowSlider.value; updateTextShadow(); });
      shadowInput.addEventListener('input', () => {
        shadowSlider.value = Math.max(0, Math.min(100, parseInt(shadowInput.value) || 0));
        updateTextShadow();
      });

      shadowHexInput.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(shadowHexInput.value)) {
          updateTextShadow();
        }
      });

      shadowColorPicker.addEventListener('input', () => {
        updateTextShadow();
      });

      loadGradient();
      loadShadowSettings();
      if (self.applyCustomizations) self.applyCustomizations();
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
        if (url.startsWith('/') || url.match(/^[A-Za-z]:\\/)) {
          const filePath = url.replace(/\\/g, '/');
          preview.src = `file://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
        } else {
          preview.src = url;
        }
      }

      const trash = document.createElement("i");
      trash.className = "fas fa-trash remove-badge";

      trash.addEventListener("click", () => { div.remove(); saveBadges(); });

      urlInput.addEventListener("input", () => {
        const newUrl = urlInput.value.trim();
        preview.src = newUrl || "";
        preview.onerror = () => preview.src = "";
        saveBadges();
      });

      div.append(handle, urlInput, preview, trash);
      return div;
    }

    function saveBadges() {
      const badges = [...badgesContent.querySelectorAll(".badge-input")]
        .map(input => input.querySelector(".badge-url").value.trim())
        .filter(Boolean);

      localStorage.setItem('badgeSettings', JSON.stringify(badges));

      if (!self.settings.local_customizations) return;

      const customizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
      const shortId = localStorage.getItem("user-id");
      const existingIndex = customizations.findIndex(c => c.shortId === shortId);
      const existing = existingIndex >= 0 ? customizations[existingIndex] : {};

      const userData = { ...existing, shortId, badges };

      if (existingIndex >= 0) {
        customizations[existingIndex] = userData;
      } else {
        customizations.push(userData);
      }

      localStorage.setItem("juice-customizations", JSON.stringify(customizations));
    }

    function loadBadges() {
      const saved = localStorage.getItem('badgeSettings');
      if (!saved) return;
      JSON.parse(saved).forEach(url => {
        badgesContent.insertBefore(createBadgeInput(url), addButton);
      });
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
      badgesContent.querySelectorAll(".badge-input").forEach(el => el.classList.remove("drag-over"));
      dragSrcEl = null;
    });

    badgesContent.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const target = e.target.closest(".badge-input");
      if (!target || target === dragSrcEl) return;
      badgesContent.querySelectorAll(".badge-input").forEach(el => el.classList.remove("drag-over"));
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
      badgesContent.querySelectorAll(".badge-input").forEach(el => el.classList.remove("drag-over"));
      saveBadges();
    });

    addButton.addEventListener("click", () => {
      badgesContent.insertBefore(createBadgeInput(), addButton);
      saveBadges();
    });

    loadBadges();
    if (self.applyCustomizations) self.applyCustomizations();
  }

  setLocalProfileBackground() {
    const self = this;
    const urlInput = document.querySelector(".custom_profile_background .background-url");
    const trash = document.querySelector(".custom_profile_background .remove-background");
    const preview = document.querySelector(".custom_profile_background .background-preview");

    function saveBackground() {
      const url = urlInput.value.trim();

      localStorage.setItem('backgroundSettings', url || "");

      if (!self.settings.local_customizations) return;

      const customizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
      const shortId = localStorage.getItem("user-id");
      const idx = customizations.findIndex(c => c.shortId === shortId);

      if (idx >= 0) {
        customizations[idx]["profile-background"] = url || null;
      } else {
        customizations.push({ shortId, "profile-background": url || null });
      }

      localStorage.setItem("juice-customizations", JSON.stringify(customizations));
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
      preview.onerror = () => { preview.src = ""; preview.style.display = "none"; };
      saveBackground();
    });

    trash.addEventListener("click", () => {
      setUrl("");
      saveBackground();
    });

    const saved = localStorage.getItem('backgroundSettings');
    if (saved) {
      setUrl(saved);
      saveBackground();
    }
  }

  setTheme() {
    this.menu
      .querySelector(".menu")
      .setAttribute("data-theme", this.settings.menu_theme);
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
  }

  handleSliderInputs() {
    const sliderMap = [
      {
        slider: document.getElementById('ads_power'),
        input: document.querySelector('.ads-power-value'),
      },
      {
        slider: document.getElementById('weapon_size'),
        input: document.querySelector('.weapon-size-value'),
      },
      {
        slider: document.getElementById('weapon_offset_x'),
        input: document.querySelector('.weapon-offset-x-value'),
      },
      {
        slider: document.getElementById('weapon_offset_y'),
        input: document.querySelector('.weapon-offset-y-value'),
      },
      {
        slider: document.getElementById('weapon_offset_z'),
        input: document.querySelector('.weapon-offset-z-value'),
      },
    ];

    sliderMap.forEach(({ slider, input }) => {
      if (!slider || !input) return;

      input.value = slider.value;

      slider.addEventListener('input', () => {
        input.value = slider.value;
      });

      input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) {
          slider.value = val;
          slider.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  handleColorInputs() {
    const colorMap = [
      {
        picker: document.querySelector('.shadow-color.color-picker'),
        hex: document.querySelector('.shadow-color.hex'),
        storageKey: null,
      },
      {
        picker: document.querySelector('.weapon-color .color-picker'),
        hex: document.querySelector('.weapon-color .hex'),
        storageKey: 'weapon_color_hex',
      },
    ];

    colorMap.forEach(({ picker, hex, storageKey }) => {
      if (!picker || !hex) return;

      if (storageKey) {
        const saved = localStorage.getItem(storageKey) || '#FFFFFF';
        hex.value = saved;
        picker.value = saved;
      }

      picker.addEventListener('input', () => {
        hex.value = picker.value.toUpperCase();
        if (storageKey) localStorage.setItem(storageKey, picker.value);
      });

      hex.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
          picker.value = hex.value;
          if (storageKey) localStorage.setItem(storageKey, hex.value);
        }
      });
    });
  }

  handleMenuKeybindChange() {
    const changeKeybindButton = this.menu.querySelector(".change-keybind");
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

        this.menu.querySelector(
          ".keybind"
        ).innerText = `Press ${this.settings.menu_keybind} to toggle menu`;
        document.removeEventListener("keydown", listener);
      };
      document.addEventListener("keydown", listener);
    });
  }

  handleMenuInputChange(input) {
    const setting = input.dataset.setting;
    const type = input.type;
    let value =
      type === "checkbox"
        ? input.checked
        : type === "range" || type === "number"
          ? Number(input.value)
          : input.value;
    this.settings[setting] = value;
    ipcRenderer.send("update-setting", setting, value);
    const event = new CustomEvent("juice-settings-changed", {
      detail: { setting: setting, value: value },
    });
    document.dispatchEvent(event);
  }

  handleMenuInputChanges() {
    const inputs = this.menu.querySelectorAll("input[data-setting]");
    const textareas = this.menu.querySelectorAll("textarea[data-setting]");
    inputs.forEach((input) => {
      input.addEventListener("change", () => this.handleMenuInputChange(input));
    });

    textareas.forEach((textarea) => {
      textarea.addEventListener("change", () =>
        this.handleMenuInputChange(textarea)
      );
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
      select.addEventListener("change", () =>
        this.handleMenuSelectChange(select)
      );
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

    const contents = [...this.menu.querySelectorAll(".juice.options")].filter(el => !el.classList.contains("inner"));
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

    this.localStorage.setItem("juice-menu-inner-tab", tabName);

    const contents = this.menu.querySelectorAll(".juice.options.inner");
    tabs.forEach((tab) => {
      tab.classList.remove("active");
    });
    contents.forEach((content) => {
      content.classList.remove("active");
    });
    tab.classList.add("active");
    this.tabToContentMap[tab.dataset.tab].classList.add("active");

    const content = this.menu.querySelector(".content");
    const currentTab = this.localStorage.getItem("juice-menu-tab");
    content.classList.toggle("browse-community", currentTab === "browse" && tabName === "community");
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

  handleSearch() {
    const searchInput = this.menu.querySelector(".juice.search");
    const settings = this.menu.querySelectorAll(".option:not(.custom)");

    const resetSettings = () => {
      settings.forEach((s) => (s.style.display = "flex"));
      this.menu.querySelectorAll(".option-group").forEach((g) => (g.style.display = "flex"));
    };

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
        subtree: true
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
      subtree: true
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
        console.log(selectedTradeId);

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
      const modal = this.createModal(
        "Import settings",
        "Paste your settings here to import them"
      );

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
      const modal = this.createModal(
        "Export settings",
        "Copy your settings here to export them"
      );

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

    let clickCounter = 0;
    const resetJuiceSettings = this.menu.querySelector("#reset-juice-settings");
    resetJuiceSettings.addEventListener("click", () => {
      clickCounter++;
      if (clickCounter === 1) {
        resetJuiceSettings.style.background = "rgba(var(--red), 0.25)";
        const text = resetJuiceSettings.querySelector(".text");
        text.innerText = "Are you sure?";

        const description = resetJuiceSettings.querySelector(".description");
        description.innerText =
          "This will restart the client and reset all settings. Click again to confirm";
      } else if (clickCounter === 2) {
        ipcRenderer.send("reset-juice-settings");
      }
    });

    const remoteToStaticLinks = this.menu.querySelector(
      "#remote-to-static-links"
    );
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
          if (!response.ok)
            throw new Error(`Invalid response: ${response.status}`);
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

  createModal(title, description) {
    const modal = document.createElement("div");
    modal.id = "modal";

    modal.innerHTML = `
    <div class="content">
      <div class="close">
        <i class="fas fa-times"></i>
      </div>
      <div class="top">
        <span class="title">${title}</span>
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
