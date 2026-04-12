const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { version } = require("../../package.json");
const { addOpenerList } = require("../addons/opener");

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
    this.setLocalGradient();
    this.setLocalBadges();
    this.setTheme();
    this.handleKeyEvents();
    this.initMenu();
    this.handleMenuKeybindChange();
    this.handleMenuInputChanges();
    this.handleMenuSelectChanges();
    this.handleTabChanges();
    this.handleDropdowns();
    this.handleSearch();
    this.handleButtons();

    this.localStorage.getItem("juice-menu-tab")
      ? this.handleTabChange(
        this.menu.querySelector(
          `[data-tab="${this.localStorage.getItem("juice-menu-tab")}"]`
        )
      )
      : this.handleTabChange(this.menu.querySelector(".juice.tab"));
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
      const shadowHexInput = document.querySelector('.option.shadow-color .hex');
      const shadowColorPicker = document.querySelector('.option.shadow-color .color-picker');

      const previewDiv = document.createElement('div');
      previewDiv.className = 'gradient-preview';
      previewDiv.innerHTML = `<span class="preview-text">${document.querySelector(".team-section .nickname").innerHTML}</span>`;
      previewDiv.style.cssText = `margin: 16px 0; padding: 24px; border-radius: 8px; text-align: center;`;

      const previewText = previewDiv.querySelector('.preview-text');
      previewText.style.cssText = `
        background: white;
        font-size: 48px;
        font-weight: bold;
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-block;
      `;

      if (self.settings.local_animated_gradient) {
        previewText.style.backgroundSize = "200% 200%";
        previewText.style.animation = 'animated-gradient 3s linear infinite';
      }

      const rotationOption = document.querySelector('.option.rotation');
      rotationOption.parentElement.insertBefore(previewDiv, colorsContainer);

      let dragging = null;
      let placeholder = null;

      function createColorInput() {
        const div = document.createElement("div");
        div.className = "color-input";

        const reorder = document.createElement("i");
        reorder.className = "fas fa-grip-vertical drag-handle";

        const hexInput = document.createElement("input");
        hexInput.type = "text";
        hexInput.className = "hex";
        hexInput.placeholder = "#FFFFFF";
        hexInput.maxLength = 7;

        const posInput = document.createElement("input");
        posInput.type = "text";
        posInput.className = "position";
        posInput.placeholder = "0%";
        posInput.maxLength = 4;

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.className = "color-picker";
        colorPicker.value = "#ffffff";

        const trash = document.createElement("i");
        trash.className = "fas fa-trash remove-color";
        trash.style.cssText = "cursor: pointer; margin-left: 0.5rem;";

        trash.addEventListener("click", () => {
          div.remove();
          updateGradient();
        });

        hexInput.addEventListener("input", () => {
          if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
            colorPicker.value = hexInput.value;
            updateGradient();
          }
        });

        colorPicker.addEventListener("input", () => {
          hexInput.value = colorPicker.value;
          updateGradient();
        });

        posInput.addEventListener("input", updateGradient);

        div.append(reorder, hexInput, posInput, colorPicker, trash);
        return div;
      }

      function setupDrag(container, itemSelector, addBtn) {
        container.addEventListener("pointerdown", e => {
          const handle = e.target.closest(".drag-handle");
          if (!handle) return;

          e.preventDefault();
          dragging = handle.parentElement;

          placeholder = document.createElement("div");
          placeholder.className = itemSelector.includes("color") ? "color-placeholder" : "badge-placeholder";
          placeholder.style.height = dragging.getBoundingClientRect().height + "px";

          dragging.classList.add("dragging");
          dragging.style.opacity = "0.5";

          container.insertBefore(placeholder, dragging);
          handle.setPointerCapture(e.pointerId);
        });

        container.addEventListener("pointermove", e => {
          if (!dragging || !placeholder) return;
          e.preventDefault();

          const items = [...container.querySelectorAll(`${itemSelector}:not(.dragging)`)];
          let inserted = false;

          for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
              if (placeholder.nextElementSibling !== item) {
                container.insertBefore(placeholder, item);
              }
              inserted = true;
              break;
            }
          }

          if (!inserted && placeholder.nextElementSibling !== addBtn) {
            container.insertBefore(placeholder, addBtn);
          }
        });

        container.addEventListener("pointerup", e => {
          if (!dragging) return;

          const handle = e.target.closest(".drag-handle");
          if (handle) handle.releasePointerCapture(e.pointerId);

          dragging.classList.remove("dragging");
          dragging.style.opacity = "";

          if (placeholder?.parentElement) {
            container.insertBefore(dragging, placeholder);
            placeholder.remove();
          }

          placeholder = null;
          dragging = null;

          itemSelector.includes("color") ? updateGradient() : null;
        });

        container.addEventListener("pointercancel", () => {
          if (!dragging) return;
          dragging.classList.remove("dragging");
          dragging.style.opacity = "";
          placeholder?.parentElement && placeholder.remove();
          placeholder = null;
          dragging = null;
        });
      }

      function updateGradient() {
        const inputs = colorsContainer.querySelectorAll(".color-input");
        const rotation = rotationSlider.value || 90;

        const stops = [...inputs].map(input => {
          const hex = input.querySelector(".hex").value || "#ffffff";
          const pos = input.querySelector(".position").value || "0%";
          return `${hex} ${pos}`;
        });

        previewText.style.backgroundImage = `linear-gradient(${rotation}deg, ${stops.join(", ")})`;

        localStorage.setItem('gradientSettings', JSON.stringify({
          rotation,
          colors: stops.map((_, i) => ({
            hex: inputs[i].querySelector(".hex").value || "#ffffff",
            position: inputs[i].querySelector(".position").value || "0%"
          }))
        }));

        saveToCustomizations();
      }

      function updateTextShadow() {
        const intensity = shadowSlider.value || 0;
        const color = shadowColorPicker.value || '#FFFFFF';

        previewText.style.textShadow = intensity > 0 ? `0 0 ${intensity}px ${color}` : 'none';

        localStorage.setItem('gradientShadowSettings', JSON.stringify({ intensity, color }));
        saveToCustomizations();
      }

      function saveToCustomizations() {
        if (!self.settings.local_customizations) return;

        const customizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
        const shortId = localStorage.getItem("user-id");
        const inputs = colorsContainer.querySelectorAll(".color-input");
        const badgeInputs = document.querySelectorAll(".badge-input");

        const stops = [...inputs].map(input => input.querySelector(".hex").value || "#ffffff");
        const badges = [...badgeInputs].map(input => input.querySelector(".badge-url").value.trim()).filter(Boolean);
        const intensity = shadowSlider.value || 0;
        const color = shadowColorPicker.value || '#FFFFFF';

        const userData = {
          shortId,
          gradient: {
            rot: `${rotationSlider.value || 90}deg`,
            stops,
            shadow: intensity > 0 ? `0px 0px ${intensity}px ${color}` : "none"
          },
          animated: self.settings.local_animated_gradient,
          badges
        };

        const existingIndex = customizations.findIndex(c => c.shortId === shortId);
        existingIndex >= 0 ? customizations[existingIndex] = userData : customizations.push(userData);

        localStorage.setItem("juice-customizations", JSON.stringify(customizations));
      }

      function loadGradient() {
        const saved = localStorage.getItem('gradientSettings');
        if (!saved) return;

        const data = JSON.parse(saved);
        rotationSlider.value = data.rotation;
        rotationInput.value = data.rotation;

        data.colors.forEach(color => {
          const colorInput = createColorInput();
          colorsContainer.insertBefore(colorInput, addButton);
          colorInput.querySelector(".hex").value = color.hex;
          colorInput.querySelector(".position").value = color.position;
          colorInput.querySelector(".color-picker").value = color.hex;
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
        updateTextShadow();
      }

      addButton.addEventListener("click", () => {
        colorsContainer.insertBefore(createColorInput(), addButton);
        updateGradient();
      });

      rotationSlider.addEventListener('input', () => {
        rotationInput.value = rotationSlider.value;
        updateGradient();
      });

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
          previewText.style.backgroundSize = "100% 100%";
          previewText.style.animation = "";
        }
        saveToCustomizations();
      });

      shadowSlider.addEventListener('input', () => {
        shadowInput.value = shadowSlider.value;
        updateTextShadow();
      });

      shadowInput.addEventListener('input', () => {
        shadowSlider.value = Math.max(0, Math.min(10, parseInt(shadowInput.value) || 0));
        updateTextShadow();
      });

      shadowHexInput.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(shadowHexInput.value)) {
          shadowColorPicker.value = shadowHexInput.value;
          updateTextShadow();
        }
      });

      shadowColorPicker.addEventListener('input', () => {
        shadowHexInput.value = shadowColorPicker.value;
        updateTextShadow();
      });

      setupDrag(colorsContainer, ".color-input", addButton);
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
      div.style.cssText = "display: flex; align-items: center; gap: 8px; margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;";

      const reorder = document.createElement("i");
      reorder.className = "fas fa-grip-vertical drag-handle";

      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "badge-url";
      urlInput.placeholder = "https://.../.png";
      urlInput.value = url;
      urlInput.style.cssText = "flex: 1; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white;";

      const preview = document.createElement("img");
      preview.className = "badge-preview";
      preview.style.cssText = "width: 32px; height: 32px; object-fit: contain; background: rgba(0,0,0,0.2); border-radius: 4px;";
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
      trash.style.cursor = "pointer";

      trash.addEventListener("click", () => {
        div.remove();
        saveBadges();
      });

      urlInput.addEventListener("input", () => {
        const newUrl = urlInput.value.trim();
        preview.src = newUrl || "";
        preview.onerror = () => preview.src = "";
        saveBadges();
      });

      div.append(reorder, urlInput, preview, trash);
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

      if (existingIndex >= 0) {
        customizations[existingIndex].badges = badges;
      } else {
        customizations.push({
          shortId,
          gradient: { rot: "90deg", stops: ["#ffffff"], shadow: "none" },
          animated: false,
          badges
        });
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

    addButton.addEventListener("click", () => {
      badgesContent.insertBefore(createBadgeInput(), addButton);
      saveBadges();
    });

    const setupDrag = (container, selector, btn) => {
      let dragging = null, placeholder = null;

      container.addEventListener("pointerdown", e => {
        const handle = e.target.closest(".drag-handle");
        if (!handle) return;
        e.preventDefault();

        dragging = handle.parentElement;
        placeholder = document.createElement("div");
        placeholder.className = "badge-placeholder";
        placeholder.style.cssText = `height: ${dragging.getBoundingClientRect().height}px; background: rgba(0,0,0,0.1); border: 2px dashed #999; border-radius: 4px; margin: 8px 0;`;

        dragging.style.opacity = "0.5";
        container.insertBefore(placeholder, dragging);
        handle.setPointerCapture(e.pointerId);
      });

      container.addEventListener("pointermove", e => {
        if (!dragging) return;
        e.preventDefault();

        const items = [...container.querySelectorAll(`${selector}:not([style*="opacity: 0.5"])`)];
        let inserted = false;

        for (const item of items) {
          const rect = item.getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            if (placeholder.nextElementSibling !== item) container.insertBefore(placeholder, item);
            inserted = true;
            break;
          }
        }

        if (!inserted && placeholder.nextElementSibling !== btn) container.insertBefore(placeholder, btn);
      });

      container.addEventListener("pointerup", e => {
        if (!dragging) return;

        const handle = e.target.closest(".drag-handle");
        if (handle) handle.releasePointerCapture(e.pointerId);

        dragging.style.opacity = "";
        if (placeholder?.parentElement) {
          container.insertBefore(dragging, placeholder);
          placeholder.remove();
        }

        dragging = placeholder = null;
        saveBadges();
      });

      container.addEventListener("pointercancel", () => {
        if (!dragging) return;
        dragging.style.opacity = "";
        placeholder?.remove();
        dragging = placeholder = null;
      });
    };

    setupDrag(badgesContent, ".badge-input", addButton);
    loadBadges();
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

    const contents = this.menu.querySelectorAll(".juice.options");
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
    searchInput.addEventListener("input", () => {
      const searchValue = searchInput.value.toLowerCase();
      settings.forEach((setting) => {
        setting.style.display = setting.textContent
          .toLowerCase()
          .includes(searchValue)
          ? "flex"
          : "none";

        const parent = setting.parentElement;
        if (parent.classList.contains("option-group")) {
          const children = parent.children;
          const visibleChildren = Array.from(children).filter(
            (child) => child.style.display === "flex"
          );
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
