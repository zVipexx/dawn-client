const Menu = require("./menu");
const { opener } = require("../addons/opener");
const { editResourceSwapper } = require("../addons/swappermenu");
const { customReqScripts } = require("../addons/customReqScripts");
const { ipcRenderer, clipboard, app, contextBridge } = require("electron");
const { initGallery } = require("../addons/gallery");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

require("../addons/Custom Skin Link")

const scriptsPath = ipcRenderer.sendSync("get-scripts-path");
const scripts = fs.readdirSync(scriptsPath);

const settings = ipcRenderer.sendSync("get-settings");
const base_url = settings.base_url;

if (!window.location.href.startsWith(base_url)) {
  delete window.process;
  delete window.require;
  return;
} else {
  scripts.forEach((script) => {
    if (!script.endsWith(".js")) return;
    const scriptPath = path.join(scriptsPath, script);
    try {
      require(scriptPath);
    } catch (error) {
      console.error(`Error loading script ${script}:`, error);
    }
  });
}

const observeForElement = (selector, functionToRun, target = document.body) => {
  const observer = new MutationObserver((mutations, obs) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches(selector)) {
              functionToRun(node);
            } else {
              const inner = node.querySelector(selector);
              if (inner) functionToRun(inner);
            }
          }
        });
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
};

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  trace: console.trace.bind(console),
};

window.addEventListener("DOMContentLoaded", async () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.trace = originalConsole.trace;

  const menu = new Menu();
  menu.init();

  opener();
  customReqScripts(settings);
  editResourceSwapper();
  initGallery();

  const fetchAll = async () => {
    const [customizations, clan, weapons] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/zVipexx/dawn-client/refs/heads/main/badges.json"
      ).then((r) => r.json()),
      fetch(
        "https://raw.githubusercontent.com/zVipexx/dawn-client/refs/heads/main/clans.json"
      ).then((r) => r.json()),
    ])

    localStorage.setItem("juice-customizations", JSON.stringify(customizations))
    localStorage.setItem("juice-clans", JSON.stringify(clan))
  }
  fetchAll();

  const formatLink = (link) => link.replace(/\\/g, "/");

  const lobbyKeybindReminder = (settings) => {
    const keybindReminder = document.createElement("span");
    keybindReminder.id = "juice-keybind-reminder";
    keybindReminder.style = `position: absolute; left: 147px; bottom: 10px; font-size: 0.9rem; color: #fff; width: max-content`;

    keybindReminder.innerText = `Press ${settings.menu_keybind} to open the client menu.`;

    if (
      !document.querySelector("#app > .interface") ||
      document.querySelector("#juice-keybind-reminder")
    )
      return;

    document.querySelector("#app #left-icons").appendChild(keybindReminder);
  };

  const lobbyNews = async (settings) => {
    if (
      !document.querySelector("#app > .interface") ||
      document.querySelector(".lobby-news")
    )
      return;

    const { general_news, promotional_news, event_news, alert_news } = settings;
    if (!general_news && !promotional_news && !event_news && !alert_news)
      return;

    let news = await fetch(
      "https://raw.githubusercontent.com/zVipexx/dawn-client/refs/heads/main/news.json"
    ).then((r) => r.json());
    if (!news.length) return;

    news = news.filter(({ category }) => {
      const categories = {
        general: general_news,
        promotional: promotional_news,
        event: event_news,
        alert: alert_news,
      };
      return categories[category];
    });

    const lobbyNewsContainer = document.createElement("div");
    lobbyNewsContainer.id = "lobby-news";
    lobbyNewsContainer.className = "lobby-news";
    lobbyNewsContainer.style = `
      width: 250px;
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      top: 178px;
      left: 148px;
      pointer-events: auto;
    `;
    const dailyBtn = document.querySelector(".daily-rewards-btn");
    const btnBottom = dailyBtn ? dailyBtn.getBoundingClientRect().bottom + window.scrollY : 280;
    lobbyNewsContainer.style.top = `${btnBottom + 8}px`;
    document
      .querySelector("#app #left-interface")
      .appendChild(lobbyNewsContainer);

    const createNewsCard = (newsItem) => {
      const div = document.createElement("div");
      div.className = "news-card";
      div.style = `
        width: 100%;
        border: 4px solid #3e4d7c;
        border-bottom: solid 4px #26335b;
        border-top: 4px solid #4d5c8b;
        background-color: #3b4975;
        display: flex;
        position: relative;
        ${newsItem.link ? "cursor: pointer;" : ""}
        ${newsItem.imgType === "banner" ? "flex-direction: column;" : ""}
      `;
      lobbyNewsContainer.appendChild(div);

      const addImage = () => {
        const img = document.createElement("img");
        img.className = `news-img ${newsItem.imgType}`;
        img.src = newsItem.img;
        img.style = `
          width: ${newsItem.imgType === "banner" ? "100%" : "4rem"};
          max-height: ${newsItem.imgType === "banner" ? "7.5rem" : "4rem"};
          object-fit: cover;
          object-position: center;
        `;
        div.appendChild(img);
      };

      const addBadge = (text, color) => {
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "badge";
        badgeSpan.innerText = text;
        badgeSpan.style = `
          position: absolute;
          top: 0;
          right: 0;
          background-color: ${color};
          color: #fff;
          padding: 0.15rem 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 0 0 0 0.25rem;
        `;
        div.appendChild(badgeSpan);
      };

      const addContent = () => {
        const content = document.createElement("div");
        content.className = "news-container";
        content.style = `
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: left;
        `;

        const title = document.createElement("span");
        title.className = "news-title";
        title.innerText = newsItem.title;
        title.style = `
          font-size: 1.2rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
          color: #ffb914;
        `;
        content.appendChild(title);

        const text = document.createElement("span");
        text.className = "news-content";
        text.innerText = newsItem.content;
        text.style = `
          font-size: 0.9rem;
          color: #fff;
          margin: 0;
        `;

        if (newsItem.content) content.appendChild(text);
        div.appendChild(content);
      };

      if (newsItem.img && newsItem.img !== "") addImage();
      if (
        newsItem.updatedAt &&
        newsItem.updatedAt > Date.now() - 432000000 &&
        !newsItem.live
      )
        addBadge("NEW", "#e24f4f");
      else if (newsItem.live) addBadge("LIVE", "#4dbf4d");
      addContent();

      div.onclick = () => {
        if (newsItem.link) {
          if (newsItem.link.startsWith("https://kirka.io/"))
            window.location.href = newsItem.link;
          else
            window.open(
              newsItem.link.replace("https://kirka.io/", base_url),
              "_blank"
            );
        }
      };
    };

    news.forEach((newsItem) => createNewsCard(newsItem));
  };

  const juiceDiscordButton = () => {
    const btn = document.querySelectorAll(".card-cont.soc-group")[1];
    if (!btn || document.querySelector("#juice-discord-btn")) return;

    const discordBtn = btn.cloneNode(true);
    discordBtn.className =
      "card-cont soc-group transfer-list-top-enter transfer-list-top-enter-active";
    discordBtn.id = "juice-discord-btn";
    discordBtn.style = `
    background: radial-gradient(circle at 75%, #FFCA8A 0%, rgba(255, 123, 0, 1) 33%) !important;
    border-bottom-color: rgba(255, 100, 0, 1) !important;
    border-top-color: rgba(252, 167, 69, 1) !important;
    border-right-color: rgba(115, 63, 0, 1) !important;
    border-radius: 0 0 2px 5px !important;`;
    const textDivs = discordBtn.querySelector(".text-soc").children;
    textDivs[0].innerText = "DAWN";
    textDivs[1].innerText = "DISCORD";

    const i = document.createElement("i");
    i.className = "fab fa-discord";
    i.style.fontSize = "48px";
    i.style.fontFamily = "Font Awesome 6 Brands";
    i.style.margin = "3.2px 1.6px 0 1.6px";
    i.style.textShadow = "0 0 0 transparent";
    discordBtn.querySelector("svg").replaceWith(i);

    discordBtn.onclick = () => {
      window.open("https://discord.gg/VsMEQ3HWs2", "_blank");
    };

    btn.replaceWith(discordBtn);

    setInterval(() => {
      discordBtn.className = "card-cont soc-group";
    }, 300);
  };

  const initRoomPresets = () => {
    let presets = (() => {
      try {
        const stored = localStorage.getItem("dawn-room-presets");
        const p = JSON.parse(stored || "[]");
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();

    const savePresets = () => {
      localStorage.setItem("dawn-room-presets", JSON.stringify(presets));
    };

    const scrapeSettings = (modal) => {
      const settings = { selects: {}, modes: {}, maps: {}, weapons: {}, inputs: {} };

      modal.querySelectorAll(".element").forEach(el => {
        const labelEl = el.querySelector(".label");
        if (!labelEl) return;
        const label = labelEl.textContent.trim().split(" ")[0].split("\n")[0];
        const selected = el.querySelector(".right .selected")?.textContent.trim();
        if (label && selected) settings.selects[label] = selected;
      });

      modal.querySelectorAll(".mods .custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const input = cb.querySelector("input");
        if (label && input) settings.modes[label] = input.checked;
      });

      modal.querySelectorAll(".map .custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const input = cb.querySelector("input");
        if (label && input) settings.maps[label] = input.checked;
      });

      modal.querySelectorAll(".weapons-cont .custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const input = cb.querySelector("input");
        if (label && input) settings.weapons[label] = input.checked;
      });

      const mapInput = modal.querySelector(".keybind-input input");
      if (mapInput) settings.inputs.mapCode = mapInput.value;

      const nameInput = modal.querySelector(".server-name-input input");
      if (nameInput) settings.inputs.serverName = nameInput.value;

      return settings;
    };

    const applyPreset = async (modal, preset) => {
      const elements = Array.from(modal.querySelectorAll(".element"));

      for (const el of elements) {
        const labelEl = el.querySelector(".label");
        if (!labelEl) continue;
        const label = labelEl.textContent.trim().split(" ")[0].split("\n")[0];
        const targetVal = preset.settings.selects[label];

        if (targetVal) {
          const rightPart = el.querySelector(".right");
          const selectedEl = rightPart?.querySelector(".selected");

          if (selectedEl && selectedEl.textContent.trim() !== targetVal) {
            rightPart.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            rightPart.click();

            await new Promise(resolve => setTimeout(resolve, 0));

            let options = Array.from(el.querySelectorAll(".items div"));
            if (options.length === 0) options = Array.from(document.querySelectorAll(".items div"));

            for (const opt of options) {
              if (opt.textContent.trim() === targetVal) {
                opt.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                opt.click();
                opt.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                break;
              }
            }

            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }

      modal.querySelectorAll(".mods .custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const targetState = preset.settings.modes?.[label];
        const input = cb.querySelector("input");
        if (label && targetState !== undefined && input.checked !== targetState) input.click();
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      modal.querySelectorAll(".map .custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const targetState = preset.settings.maps?.[label];
        const input = cb.querySelector("input");
        if (label && targetState !== undefined && input.checked !== targetState) input.click();
      });

      modal.querySelectorAll(".weapons-cont .custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const targetState = preset.settings.weapons?.[label];
        const input = cb.querySelector("input");
        if (label && targetState !== undefined && input.checked !== targetState) input.click();
      });

      const mapInput = modal.querySelector(".keybind-input input");
      if (mapInput) {
        mapInput.value = preset.settings.inputs.mapCode || "";
        mapInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const nameInput = modal.querySelector(".server-name-input input");
      if (nameInput) {
        nameInput.value = preset.settings.inputs.serverName || "";
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    const renderPresets = (container, modal) => {
      const list = container.querySelector(".room-presets-list");
      list.innerHTML = "";

      if (presets.length === 0) {
        list.innerHTML = `<div style="text-align: center; opacity: 0.5; padding: 20px; font-size: 0.9rem;">No presets saved</div>`;
        return;
      }

      let dragSrcIndex = null;

      presets.forEach((preset, index) => {
        const item = document.createElement("div");
        item.className = "room-preset-item";
        item.dataset.index = index;
        item.innerHTML = `
          <i class="fas fa-grip-vertical room-preset-drag-handle"></i>
          <input class="room-preset-name-input" type="text" value="${preset.name}" />
          <div class="room-preset-actions">
            <i class="fas fa-play room-preset-action apply" title="Apply"></i>
            <i class="fas fa-upload room-preset-action override" title="Override"></i>
            <i class="fas fa-trash room-preset-action delete" title="Delete"></i>
          </div>
        `;

        const handle = item.querySelector(".room-preset-drag-handle");
        handle.draggable = true;

        handle.addEventListener("dragstart", (e) => {
          dragSrcIndex = index;
          e.dataTransfer.effectAllowed = "move";
          setTimeout(() => item.classList.add("dragging"), 0);
        });

        item.addEventListener("dragend", () => {
          item.classList.remove("dragging");
          list.querySelectorAll(".room-preset-item").forEach(el => el.classList.remove("drag-over"));
        });

        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          list.querySelectorAll(".room-preset-item").forEach(el => el.classList.remove("drag-over"));
          item.classList.add("drag-over");
        });

        item.addEventListener("drop", (e) => {
          e.preventDefault();
          if (dragSrcIndex === null || dragSrcIndex === index) return;
          const [moved] = presets.splice(dragSrcIndex, 1);
          presets.splice(index, 0, moved);
          savePresets();
          renderPresets(container, modal);
        });

        const nameInput = item.querySelector(".room-preset-name-input");
        nameInput.onchange = () => {
          preset.name = nameInput.value.trim() || preset.name;
          nameInput.value = preset.name;
          savePresets();
        };
        nameInput.onclick = (e) => e.stopPropagation();

        const applyIcon = item.querySelector(".apply");
        const runApply = async () => {
          if (item.dataset.loading === "true") return;
          item.dataset.loading = "true";
          applyIcon.className = "fas fa-spinner fa-spin room-preset-action";
          await applyPreset(modal, preset);
          applyIcon.className = "fas fa-check room-preset-action";
          setTimeout(() => {
            applyIcon.className = "fas fa-play room-preset-action apply";
            delete item.dataset.loading;
          }, 1000);
        };

        applyIcon.onclick = (e) => { e.stopPropagation(); runApply(); };

        item.ondblclick = (e) => {
          if (e.target.closest(".room-preset-action") || e.target.closest(".room-preset-name-input")) return;
          runApply();
        };

        item.querySelector(".override").onclick = (e) => {
          e.stopPropagation();
          const icon = item.querySelector(".override");
          preset.settings = scrapeSettings(modal);
          savePresets();
          icon.className = "fas fa-check room-preset-action";
          setTimeout(() => {
            icon.className = "fas fa-upload room-preset-action override";
          }, 1000);
        };

        item.querySelector(".delete").onclick = (e) => {
          e.stopPropagation();
          presets.splice(index, 1);
          savePresets();
          renderPresets(container, modal);
        };

        list.appendChild(item);
      });
    };

    const injectSidebar = (container) => {
      if (container.querySelector(".room-presets-sidebar")) return;

      container.querySelector(".vm--modal").style.overflow = "visible";

      const sidebar = document.createElement("div");
      sidebar.className = "room-presets-sidebar";
      sidebar.innerHTML = `
        <div class="room-presets-header">
          <div class="top">
            <div class="room-presets-title">PRESETS</div>
            <div class="right">
              <i class="fas fa-share room-preset-action export" title="Share Presets"></i>
              <i class="fas fa-file-import room-preset-action import" title="Import Presets"></i>
            </div>
          </div>
        </div>
        <div class="room-presets-list"></div>
        <div class="juice-button save-preset">
          SAVE CURRENT
        </div>
      `;

      sidebar.querySelector(".export").onclick = () => {
        clipboard.writeText(JSON.stringify(presets));
        alert("Presets copied to clipboard!");
      }

      sidebar.querySelector(".import").onclick = () => {
        if (sidebar.querySelector(".import-presets")) {
          sidebar.querySelector(".import-presets").remove();
          return;
        };

        const modal = document.createElement("div");
        modal.classList.add("import-presets");
        modal.innerHTML = `
          <input class="import-input" type="text" placeholder="Paste preset settings" />
          <i class="fas fa-check room-preset-action confirm"></i>
        `;

        sidebar.querySelector(".room-presets-header").appendChild(modal);

        modal.querySelector(".confirm").onclick = () => {
          const input = modal.querySelector(".import-input").value;
          if (input) {
            try {
              const imported = JSON.parse(input);
              if (Array.isArray(imported)) {
                localStorage.setItem("dawn-room-presets", input);
                presets = imported;
                savePresets();
                renderPresets(sidebar, container.querySelector(".vm--modal"));
              }
            } catch (e) {
              alert("Invalid JSON format");
            }
          }
          modal.remove();
        };
      }

      sidebar.querySelector(".save-preset").onclick = () => {
        const modal = container.querySelector(".vm--modal");
        const settings = scrapeSettings(modal);
        presets.push({ name: `Preset ${presets.length + 1}`, settings });
        savePresets();
        renderPresets(sidebar, modal);

        const btn = sidebar.querySelector(".save-preset");
        btn.innerHTML = `<i class="fas fa-check"></i> SAVED!`;
        btn.style.color = "#fff";

        setTimeout(() => {
          btn.innerHTML = "SAVE CURRENT";
          btn.style.background = "";
          btn.style.color = "";
        }, 1500);
      };

      const modal = container.querySelector(".vm--modal");
      if (modal) {
        modal.appendChild(sidebar);
        renderPresets(sidebar, modal);
      }
    };

    const createObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.classList.contains("vm--container")) {
            setTimeout(() => {
              if (node.querySelector(".create-btn")) {
                injectSidebar(node);
              }
            }, 0);
          }
        }
      }
    });

    const interfaceEl = document.querySelector("#app .interface") || document.querySelector(".interface");
    if (interfaceEl) {
      createObserver.observe(interfaceEl, { childList: true });
    } else {
      observeForElement(".interface", (iface) => {
        createObserver.observe(iface, { childList: true });
      }, document.querySelector("#app") || document.body);
    }
  };

  initSettingsSliderInputs = () => {
    function handleValues() {
      document.querySelectorAll(".settings .right").forEach((row) => {
        if (row.dataset.sliderInit) return;

        const valueDiv = row.querySelector(".value");
        const slider = row.querySelector(".range");
        if (!valueDiv || !slider) return;

        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.classList.add("setting-value");
        valueInput.value = valueDiv.textContent.trim();
        valueInput.title = "";
        valueDiv.replaceWith(valueInput);

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        ).set;

        function setSliderValue(num) {
          if (num < parseFloat(slider.min)) slider.min = num;
          if (num > parseFloat(slider.max)) slider.max = num;

          nativeInputValueSetter.call(slider, num);
          slider.dispatchEvent(new Event("input", { bubbles: true }));
          slider.dispatchEvent(new Event("change", { bubbles: true }));
        }

        slider.addEventListener("input", () => {
          valueInput.value = slider.value;
        });

        valueInput.addEventListener("blur", () => {
          const raw = valueInput.value;
          const num = parseFloat(raw);

          if (raw === "" || Number.isNaN(num)) {
            valueInput.value = slider.value;
            return;
          }

          setSliderValue(num);
        });

        valueInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            valueInput.blur();
          }
        });

        row.dataset.sliderInit = "1";
      });
    }

    handleValues();

    document.querySelectorAll(".settings .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        handleValues();
      });
    });
  }

  observeForElement(".settings", initSettingsSliderInputs)

  const loadTheme = () => {
    const addedStyles = document.createElement("style");
    addedStyles.id = "juice-styles-theme";
    document.head.appendChild(addedStyles);

    const customStyles = document.createElement("style");
    customStyles.id = "juice-styles-custom";
    document.head.appendChild(customStyles);

    window.updateTheme = () => {
      const settings = ipcRenderer.sendSync("get-settings");
      const cssLink = settings.css_link;
      const advancedCSS = settings.advanced_css;

      if (cssLink && settings.css_enabled) {
        addedStyles.innerHTML = `@import url("${formatLink(cssLink)}");`;
      } else {
        addedStyles.innerHTML = "";
      }

      customStyles.innerHTML = advancedCSS;
    };

    window.updateTheme();
  };

  const applyUIFeatures = () => {
    const addedStyles = document.createElement("style");
    addedStyles.id = "juice-styles-ui-features";
    document.head.appendChild(addedStyles);

    const updateUIFeatures = () => {
      const settings = ipcRenderer.sendSync("get-settings");
      const styles = [];

      if (settings.perm_tablist)
        styles.push(
          ".desktop-game-interface .tab-info, .tab-team-info { display: flex !important; border-radius: 0.5rem !important; max-width: 30rem !important; top: 0 !important; right: 0 !important; position: absolute; margin: 0.5rem !important; padding: 0.15rem !important; width: 35rem !important; box-shadow: none !important; }",
          ".desktop-game-interface .tab-team-info .players-cont { flex-direction: column !important; }",
          ".desktop-game-interface .tab-info .player-list, .tab-team-info .player-list { margin: unset !important; gap: 0.25rem; }",
          ".desktop-game-interface .tab-info > .head, .tab-team-info > .head { display: none; }",
          ".desktop-game-interface .tab-team-info .player-list:nth-child(1)::before { content: 'RED'; width: 100%; text-align: left; padding: 0.25rem 0.5rem; font-size: 1.25rem; background-color: #ff4d42; border-radius: 0.25rem; box-sizing: border-box; }",
          ".desktop-game-interface .tab-team-info .player-list:nth-child(2)::before { content: 'BLUE'; width: 100%; text-align: left; padding: 0.25rem 0.5rem; font-size: 1.25rem; background-color: #0d6dc6; border-radius: 0.25rem; box-sizing: border-box; margin-top: 0.5rem; }",
          ".desktop-game-interface .players-wrap .list { display: none !important; }",
          ".desktop-game-interface .tab-info .list, .tab-team-info .player-list > .list { order: 999; }",
          ".desktop-game-interface .tab-info .players-wrap, .tab-team-info .players-wrap { padding: 0.25rem; }",
          ".desktop-game-interface .tab-info .player-cont, .tab-team-info .player-cont { margin: unset; }",
          ".desktop-game-interface .kill-bar-cont { right: 37.5rem !important; }",
          ".desktop-game-interface .tab-info { background: #141414a3 !important; border-radius: 0.25rem !important; max-width: 35rem !important; }",
          ".desktop-game-interface .tab-info .head { background: linear-gradient(90deg, #ff932d, transparent) !important; border: unset; font-style: normal; border-top-left-radius: 0.25rem; }",
          ".desktop-game-interface .tab-info .head .server-id { display: none; }",
          ".desktop-game-interface .tab-info .list-value { color: #acfa70; }",
          ".desktop-game-interface .tab-team-info { background: #141414a3 !important; border-radius: 0.25rem !important; max-width: 60rem !important; }",
          ".desktop-game-interface .tab-team-info .head { background: transparent !important; }",
          ".desktop-game-interface .tab-team-info .label.red { border-top-left-radius: 0.25rem; background: linear-gradient(90deg, #ff4c4c, #141414a3); justify-content: flex-start; padding-left: 0.75rem; }",
          ".desktop-game-interface .tab-team-info .label.blue { border-top-right-radius: 0.25rem; background: linear-gradient(-90deg, #4476ff, #141414a3); justify-content: flex-end; padding-right: 0.75rem; }",
          ".desktop-game-interface .player-list .list-value { color: #acfa70; }",
          ".desktop-game-interface .player-list .player-cont { background: #141414a3 !important; border-radius: 0.25rem; padding: 0.25rem }",
          ".desktop-game-interface .player-list .player-cont.dead .player-left { transform: translateX(2rem) }",
          ".desktop-game-interface .player-cont .nickname.bolder { color: #edb846; }"
        );
      if (settings.hide_chat)
        styles.push(
          ".desktop-game-interface > #bottom-left > .chat { display: none !important; }"
        );
      if (settings.hide_kill_text)
        styles.push(
          ".ach-cont .text { display: none !important; }"
        );
      if (settings.hide_interface)
        styles.push(
          ".desktop-game-interface, .crosshair-cont, .ach-cont, .hitme-cont, .sniper-mwNMW-cont, .team-score, .score { display: none !important; }"
        );
      if (settings.skip_loading)
        styles.push(".loading-scene { display: none !important; }");
      if (settings.chat_height) {
        styles.push(`.desktop-game-interface #chat { bottom: calc(4.7em + ${settings.chat_height}em * 1.2) !important } .desktop-game-interface #chat .messages { min-height: calc(11.75em + ${settings.chat_height}em) !important }`)
      }
      if (settings.interface_opacity)
        styles.push(
          `.desktop-game-interface { opacity: ${settings.interface_opacity}% !important; }`
        );
      if (settings.interface_bounds) {
        let scale =
          settings.interface_bounds === "1"
            ? 0.9
            : settings.interface_bounds === "0"
              ? 0.8
              : 1;
        styles.push(
          `.desktop-game-interface { transform: scale(${scale}) !important; }`
        );
      }
      if (settings.hitmarker_link !== "")
        styles.push(
          `.hitmark { content: url(${formatLink(
            settings.hitmarker_link
          )}) !important; }`
        );
      if (settings.killicon_link !== "")
        styles.push(`.animate-cont::before { content: ""; 
      background: url(${formatLink(
          settings.killicon_link
        )}); width: 10rem; height: 10rem; margin-bottom: 2rem; display: inline-block; background-position: center; background-size: contain; background-repeat: no-repeat; }
      .animate-cont svg { display: none; }`);
      if (settings.perm_crosshair)
        styles.push(".crosshair-static { opacity: 1 !important }")
      if (!settings.ui_animations)
        styles.push(
          "* { transition: none !important; animation: none !important; }"
        );
      if (settings.rave_mode)
        styles.push(
          "canvas { animation: rotateHue 1s linear infinite !important; }"
        );
      if (!settings.lobby_keybind_reminder)
        styles.push("#juice-keybind-reminder { display: none; }");
      if (!settings.spectate_button)
        styles.push(".spectate-eye { display: none !important; }");
      if (!settings.info_region)
        styles.push("#region { display: none !important; }");
      if (!settings.info_version)
        styles.push("#version { display: none !important; }");
      if (!settings.info_triangles)
        styles.push("#triangles { display: none !important; }");
      if (!settings.info_fpsavg)
        styles.push("#fpsAvg { display: none !important; }");
      if (!settings.info_fps)
        styles.push("#fps { display: none !important; }");
      if (!settings.info_ping)
        styles.push("#ping { display: none !important; }");
      if (!settings.info_tick)
        styles.push("#tickTime { display: none !important; }");
      if (!settings.info_input)
        styles.push("#inputDelay { display: none !important; }");

      addedStyles.innerHTML = styles.join("");
    };

    document.addEventListener("juice-settings-changed", (e) => {
      const relevantSettings = [
        "perm_crosshair",
        "perm_tablist",
        "perm_chat",
        "hide_chat",
        "hide_kill_text",
        "hide_interface",
        "chat_height",
        "skip_loading",
        "interface_opacity",
        "interface_bounds",
        "hitmarker_link",
        "ui_animations",
        "colored_killfeed",
        "rave_mode",
        "spectate_button",
        "show_trade_buttons",
        "accept_on_click",
        "lobby_keybind_reminder",
        "info_region",
        "info_version",
        "info_triangles",
        "info_fpsavg",
        "info_fps",
        "info_ping",
        "info_tick",
        "info_input",
      ];
      if (relevantSettings.includes(e.detail.setting)) updateUIFeatures();
    });
    updateUIFeatures();
  };

  function findCamera(instance) {
    for (const key of Object.getOwnPropertyNames(instance)) {
      try {
        const val = instance[key];
        if (!val || typeof val !== "object") continue;
        const names = Object.getOwnPropertyNames(val);
        const hasFov = names.some(k => {
          const desc = Object.getOwnPropertyDescriptor(val, k);
          if (!desc?.get) return false;
          try {
            const v = desc.get.call(val);
            return typeof v === "number" && v >= 40 && v <= 150;
          } catch (e) { return false; }
        });
        const hasZoom = names.includes("zoom");
        if (hasFov && hasZoom) return val;
      } catch (e) { }
    }
    return null;
  }

  window.ads_power = 1;
  const setAdsPower = (multiplier) => {
    window.ads_power = multiplier;

    const interval = setInterval(() => {
      if (!window.__zoomInstance) return;
      const cam = findCamera(window.__zoomInstance);
      if (!cam) return;
      clearInterval(interval);

      const fovKey = Object.getOwnPropertyNames(cam).find(key => {
        const desc = Object.getOwnPropertyDescriptor(cam, key);
        if (!desc?.get) return false;
        try {
          const val = desc.get.call(cam);
          return typeof val === "number" && val >= 40 && val <= 150;
        } catch (e) { return false; }
      });

      if (!fovKey) return;

      const desc = Object.getOwnPropertyDescriptor(cam, fovKey);
      const origGet = desc.get;
      const origSet = desc.set;

      const defaultFov = parseFloat(localStorage.getItem("SETTINGS___SETTING/CAMERA___SETTING/MAIN_FOV___SETTING")?.replace(/"/g, "")) || 100;

      let ads = false;

      Object.defineProperty(cam, fovKey, {
        get() { return origGet.call(this); },
        set(v) {
          if (v === defaultFov) {
            ads = false;
            origSet.call(this, v);
            return;
          }

          if (v < defaultFov) {
            ads = true;
          }

          if (ads) {
            const weaponConfig = window.dawnWeaponConfig;
            let adsPower = window.ads_power;

            if (weaponConfig) {
              const weaponId = weaponConfig.universalModeActive ? "universal" : (window.currentWeaponId || "vita");
              const settings = weaponConfig.getSettings(weaponId);
              adsPower = settings.adsPower ?? window.ads_power;
            }

            const zoomDelta = Math.abs(defaultFov - v);
            const curved = Math.pow(adsPower, 0.4);
            const newFov = defaultFov - zoomDelta * curved;
            origSet.call(this, Math.max(1, Math.min(179, newFov)));
          } else {
            origSet.call(this, v);
          }
        },
        configurable: true,
        enumerable: true
      });
    }, 100);
  };

  const initWeaponMods = () => {
    let inspectStart = null;
    let inspectingWeaponId = null;

    let latchedWeaponSig = null;
    let settlerSig = null;
    let settlerSince = 0;
    const SETTLE_MS = 120;

    const INSPECT_DURATIONS = {
      vita: 600,
      rev: 550,
      mac10: 800,
      ar9: 550,
      m60: 550,
      scar: 550,
      shark: 550,
      lar: 550,
      weatie: 550,
      bayonet: 800,
      tomahawk: 750,
    };

    const inspectKeyframes_vita = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX, spinX;
      if (t < 0.35) {
        const p = easeOut(t / 0.35);
        offsetZ = p * -0.3;
        offsetX = p * -0.25;
        spinX = p * -0.25;
      } else if (t < 0.85) {
        offsetZ = -0.3;
        offsetX = -0.25;
        spinX = - 0.25;
      } else {
        const p = easeIn((t - 0.85) / 0.15);
        offsetZ = (1 - p) * -0.3;
        offsetX = (1 - p) * -0.25;
        spinX = (1 - easeOut(p)) * -0.25;
      }

      const spinZ = t * Math.PI * -2;

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ,
        spinX,
      };
    };

    const inspectKeyframes_rev = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;
      const bump = t < 0.5 ? easeOut(t / 0.5) : 1 - easeIn((t - 0.5) / 0.5);
      const spinZ = (1 - Math.pow(1 - Math.pow(t, 1.2), 3)) * Math.PI * 2.0;
      return {
        offsetX: bump * 0.02,
        offsetY: bump * 0.15,
        offsetZ: 0,
        scale: 1 + bump * 0.05,
        spinZ: spinZ,
      };
    };

    const inspectKeyframes_mac10 = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;
      const spinZ = (1 - Math.pow(1 - Math.pow(t, 1.2), 3)) * Math.PI * 2.0;
      let spinX;

      if (t < 0.1) {
        spinX = easeOut(t / 0.1) * -0.25;
      } else if (t < 0.5) {
        spinX = -0.25;
      } else {
        spinX = (1 - easeIn((t - 0.5) / 0.5)) * -0.25;
      }

      return {
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        scale: 1 + 0,
        spinZ: spinZ * 4,
        spinX: spinX,
      };
    };

    const inspectKeyframes_ar9 = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX, spinX;
      if (t < 0.35) {
        const p = easeOut(t / 0.35);
        offsetZ = p * -0.2;
        offsetX = p * -0.15;
        spinX = p * -0.25;
      } else if (t < 0.85) {
        offsetZ = -0.2;
        offsetX = -0.15;
        spinX = - 0.25;
      } else {
        const p = easeIn((t - 0.85) / 0.15);
        offsetZ = (1 - p) * -0.2;
        offsetX = (1 - p) * -0.15;
        spinX = (1 - easeOut(p)) * -0.25;
      }

      const spinY = t * Math.PI * 2;

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinY,
        spinX,
      };
    };

    const inspectKeyframes_m60 = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX, spinX;
      if (t < 0.35) {
        const p = easeOut(t / 0.35);
        offsetZ = p * -0.2;
        offsetX = p * -0.15;
        spinX = p * -0.25;
      } else if (t < 0.85) {
        offsetZ = -0.2;
        offsetX = -0.15;
        spinX = - 0.25;
      } else {
        const p = easeIn((t - 0.85) / 0.15);
        offsetZ = (1 - p) * -0.2;
        offsetX = (1 - p) * -0.15;
        spinX = (1 - easeOut(p)) * -0.25;
      }

      const spinZ = t * Math.PI * -2;

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ,
        spinX,
      };
    };

    const inspectKeyframes_scar = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX, spinX;
      if (t < 0.35) {
        const p = easeOut(t / 0.35);
        offsetZ = p * -0.2;
        offsetX = p * -0.15;
        spinX = p * -0.25;
      } else if (t < 0.85) {
        offsetZ = -0.2;
        offsetX = -0.15;
        spinX = - 0.25;
      } else {
        const p = easeIn((t - 0.85) / 0.15);
        offsetZ = (1 - p) * -0.2;
        offsetX = (1 - p) * -0.15;
        spinX = (1 - easeOut(p)) * -0.25;
      }

      const spinZ = t * Math.PI * -2;

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ,
        spinX,
      };
    };

    const inspectKeyframes_shark = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;
      const bump = t < 0.5 ? easeOut(t / 0.5) : 1 - easeIn((t - 0.5) / 0.5);
      const spinX = (1 - Math.pow(1 - Math.pow(t, 1.2), 3)) * Math.PI * 2.0;
      return {
        offsetX: bump * 0.04,
        offsetY: bump * 0.20,
        offsetZ: 0,
        scale: 1 + bump * 0.08,
        spinX: spinX,
      };
    };

    const inspectKeyframes_lar = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX, spinX;
      if (t < 0.35) {
        const p = easeOut(t / 0.35);
        offsetZ = p * -0.2;
        offsetX = p * -0.15;
        spinX = p * -0.25;
      } else if (t < 0.85) {
        offsetZ = -0.2;
        offsetX = -0.15;
        spinX = - 0.25;
      } else {
        const p = easeIn((t - 0.85) / 0.15);
        offsetZ = (1 - p) * -0.2;
        offsetX = (1 - p) * -0.15;
        spinX = (1 - easeOut(p)) * -0.25;
      }

      const spinZ = t * Math.PI * -2;

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ,
        spinX,
      };
    };

    const inspectKeyframes_weatie = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX, spinX;
      if (t < 0.35) {
        const p = easeOut(t / 0.35);
        offsetZ = p * -0.2;
        offsetX = p * -0.15;
        spinX = p * -0.25;
      } else if (t < 0.85) {
        offsetZ = -0.2;
        offsetX = -0.15;
        spinX = - 0.25;
      } else {
        const p = easeIn((t - 0.85) / 0.15);
        offsetZ = (1 - p) * -0.2;
        offsetX = (1 - p) * -0.15;
        spinX = (1 - easeOut(p)) * -0.25;
      }

      const spinZ = t * Math.PI * -2;

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ,
        spinX,
      };
    };

    const inspectKeyframes_knife = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;
      const bump = t < 0.5 ? easeOut(t / 0.5) : 1 - easeIn((t - 0.5) / 0.5);
      const spinZ = (1 - Math.pow(1 - Math.pow(t, 1.2), 3)) * Math.PI * 2.0;
      return {
        offsetX: bump * 0,
        offsetY: bump * 0,
        offsetZ: 0,
        scale: 1 + bump * 0.10,
        spinZ: spinZ * 5,
      };
    };

    const inspectKeyframes_tomahawk = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;
      const spinZ = (1 - Math.pow(1 - Math.pow(t, 1.2), 3)) * Math.PI * 2.0;
      return {
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        scale: 1,
        spinZ: spinZ * -2,
      };
    };

    const armKeyframes_disabled = (t) => {
      return {
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        scale: 1,
      };
    };

    const armKeyframes_rev = (t) => {
      const arc = Math.sin(t * Math.PI);
      return {
        offsetX: arc * 0.02,
        offsetY: arc * 0.06,
        offsetZ: 0,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_vita_right = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetX, offsetY, offsetZ;

      if (t < 0.55) {
        const p = easeOut(t / 0.55);
        const arch = 4 * p * (1 - p);
        offsetX = p * -0.38;
        offsetY = arch * 0.06;
        offsetZ = p * -0.05;
      } else if (t < 0.75) {
        const p = easeIn((t - 0.55) / 0.2);
        offsetX = -0.38 + p * 0.38;
        offsetY = 0;
        offsetZ = -0.05 + p * 0.05;
      } else {
        const p = easeOut((t - 0.75) / 0.25);
        offsetX = 0;
        offsetY = 0;
        offsetZ = 0;
      }

      return {
        offsetX,
        offsetY,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_vita_left = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX;
      if (t < 0.6) {
        offsetZ = easeOut(t / 0.6) * 0.4;
        offsetX = easeOut(t / 0.6) * -0.4;
      } else {
        offsetZ = (1 - easeIn((t - 0.4) / 0.6)) * 0.4;
        offsetX = (1 - easeIn((t - 0.4) / 0.6)) * -0.4;
      }

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_ar9_right = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetX, offsetY, offsetZ;

      if (t < 0.55) {
        const p = easeOut(t / 0.55);
        const arch = 4 * p * (1 - p);
        offsetX = p * -0.38;
        offsetY = arch * 0.06;
        offsetZ = p * -0.05;
      } else if (t < 0.75) {
        const p = easeIn((t - 0.55) / 0.2);
        offsetX = -0.38 + p * 0.38;
        offsetY = 0;
        offsetZ = -0.05 + p * 0.05;
      } else {
        const p = easeOut((t - 0.75) / 0.25);
        offsetX = 0;
        offsetY = 0;
        offsetZ = 0;
      }

      return {
        offsetX,
        offsetY,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_ar9_left = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX;
      if (t < 0.6) {
        offsetZ = easeOut(t / 0.6) * 0.4;
        offsetX = easeOut(t / 0.6) * -0.4;
      } else {
        offsetZ = (1 - easeIn((t - 0.4) / 0.6)) * 0.4;
        offsetX = (1 - easeIn((t - 0.4) / 0.6)) * -0.4;
      }

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_m60_right = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetX, offsetY, offsetZ;

      if (t < 0.55) {
        const p = easeOut(t / 0.55);
        const arch = 4 * p * (1 - p);
        offsetX = p * -0.38;
        offsetY = arch * 0.06;
        offsetZ = p * -0.05;
      } else if (t < 0.75) {
        const p = easeIn((t - 0.55) / 0.2);
        offsetX = -0.38 + p * 0.38;
        offsetY = 0;
        offsetZ = -0.05 + p * 0.05;
      } else {
        const p = easeOut((t - 0.75) / 0.25);
        offsetX = 0;
        offsetY = 0;
        offsetZ = 0;
      }

      return {
        offsetX,
        offsetY,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_m60_left = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX;
      if (t < 0.6) {
        offsetZ = easeOut(t / 0.6) * 0.4;
        offsetX = easeOut(t / 0.6) * -0.4;
      } else {
        offsetZ = (1 - easeIn((t - 0.4) / 0.6)) * 0.4;
        offsetX = (1 - easeIn((t - 0.4) / 0.6)) * -0.4;
      }

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_weatie_right = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetX, offsetY, offsetZ;

      if (t < 0.55) {
        const p = easeOut(t / 0.55);
        const arch = 4 * p * (1 - p);
        offsetX = p * -0.38;
        offsetY = arch * 0.06;
        offsetZ = p * -0.05;
      } else if (t < 0.75) {
        const p = easeIn((t - 0.55) / 0.2);
        offsetX = -0.38 + p * 0.38;
        offsetY = 0;
        offsetZ = -0.05 + p * 0.05;
      } else {
        const p = easeOut((t - 0.75) / 0.25);
        offsetX = 0;
        offsetY = 0;
        offsetZ = 0;
      }

      return {
        offsetX,
        offsetY,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_weatie_left = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX;
      if (t < 0.6) {
        offsetZ = easeOut(t / 0.6) * 0.4;
        offsetX = easeOut(t / 0.6) * -0.4;
      } else {
        offsetZ = (1 - easeIn((t - 0.4) / 0.6)) * 0.4;
        offsetX = (1 - easeIn((t - 0.4) / 0.6)) * -0.4;
      }

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_lar_right = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetX, offsetY, offsetZ;

      if (t < 0.55) {
        const p = easeOut(t / 0.55);
        const arch = 4 * p * (1 - p);
        offsetX = p * -0.38;
        offsetY = arch * 0.06;
        offsetZ = p * -0.05;
      } else if (t < 0.75) {
        const p = easeIn((t - 0.55) / 0.2);
        offsetX = -0.38 + p * 0.38;
        offsetY = 0;
        offsetZ = -0.05 + p * 0.05;
      } else {
        const p = easeOut((t - 0.75) / 0.25);
        offsetX = 0;
        offsetY = 0;
        offsetZ = 0;
      }

      return {
        offsetX,
        offsetY,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_lar_left = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX;
      if (t < 0.6) {
        offsetZ = easeOut(t / 0.6) * 0.4;
        offsetX = easeOut(t / 0.6) * -0.4;
      } else {
        offsetZ = (1 - easeIn((t - 0.4) / 0.6)) * 0.4;
        offsetX = (1 - easeIn((t - 0.4) / 0.6)) * -0.4;
      }

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_scar_right = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetX, offsetY, offsetZ;

      if (t < 0.55) {
        const p = easeOut(t / 0.55);
        const arch = 4 * p * (1 - p);
        offsetX = p * -0.38;
        offsetY = arch * 0.06;
        offsetZ = p * -0.05;
      } else if (t < 0.75) {
        const p = easeIn((t - 0.55) / 0.2);
        offsetX = -0.38 + p * 0.38;
        offsetY = 0;
        offsetZ = -0.05 + p * 0.05;
      } else {
        const p = easeOut((t - 0.75) / 0.25);
        offsetX = 0;
        offsetY = 0;
        offsetZ = 0;
      }

      return {
        offsetX,
        offsetY,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_scar_left = (t) => {
      const easeOut = (x) => 1 - Math.pow(1 - x, 3);
      const easeIn = (x) => x * x * x;

      let offsetZ, offsetX;
      if (t < 0.6) {
        offsetZ = easeOut(t / 0.6) * 0.4;
        offsetX = easeOut(t / 0.6) * -0.4;
      } else {
        offsetZ = (1 - easeIn((t - 0.4) / 0.6)) * 0.4;
        offsetX = (1 - easeIn((t - 0.4) / 0.6)) * -0.4;
      }

      return {
        offsetX,
        offsetY: 0,
        offsetZ,
        scale: 1,
        spinZ: 0,
      };
    };

    const armKeyframes_shark = armKeyframes_rev;
    const armKeyframes_mac10 = armKeyframes_disabled;
    const armKeyframes_ar9 = armKeyframes_disabled;
    const armKeyframes_knife = armKeyframes_disabled;
    const armKeyframes_tomahawk = armKeyframes_disabled;

    const sigToWeaponId = {
      "0.11,0.11,0.11": "vita",
      "0.59,0.89,0.60": "scar",
      "0.17,0.17,0.17": "rev",
      "0.73,0.64,0.73": "ar9",
      "0.77,0.77,0.77": "mac10",
      "0.11,0.10,0.10": "m60",
      "0.84,0.84,0.84": "weatie",
      "0.77,1.01,0.77": "lar",
      "0.01,0.01,0.01": "shark",
      "1.27,1.05,1.62": "bayonet",
      "1.45,1.26,1.29": "bayonet",
      "1.46,1.25,1.28": "bayonet",
      "1.48,1.24,1.28": "bayonet",
      "1.48,1.24,1.27": "bayonet",
      "1.49,1.23,1.27": "bayonet",
      "1.49,1.23,1.28": "bayonet",
      "1.47,1.23,1.29": "bayonet",
      "1.46,1.23,1.32": "bayonet",
      "1.43,1.23,1.34": "bayonet",
      "1.39,1.24,1.38": "bayonet",
      "1.35,1.25,1.41": "bayonet",
      "1.31,1.26,1.43": "bayonet",
      "1.28,1.27,1.45": "bayonet",
      "1.26,1.28,1.46": "bayonet",
      "1.27,1.29,1.44": "bayonet",
      "1.29,1.31,1.41": "bayonet",
      "1.33,1.31,1.37": "bayonet",
      "1.37,1.32,1.32": "bayonet",
      "1.41,1.32,1.28": "bayonet",
      "1.42,1.31,1.27": "bayonet",
      "1.41,1.29,1.30": "bayonet",
      "1.38,1.27,1.36": "bayonet",
      "1.33,1.24,1.43": "bayonet",
      "1.29,1.21,1.50": "bayonet",
      "1.27,1.17,1.54": "bayonet",
      "1.29,1.14,1.55": "bayonet",
      "1.35,1.11,1.52": "bayonet",
      "1.44,1.08,1.45": "bayonet",
      "1.54,1.06,1.37": "bayonet",
      "1.60,1.05,1.30": "bayonet",
      "1.62,1.05,1.27": "bayonet",
      "1.59,1.05,1.31": "bayonet",
      "1.51,1.05,1.40": "bayonet",
      "1.41,1.05,1.50": "bayonet",
      "1.54,0.92,2.24": "tomahawk"
    };

    const weaponKeyframeMap = {
      "0.11,0.11,0.11": inspectKeyframes_vita,
      "0.17,0.17,0.17": inspectKeyframes_rev,
      "0.77,0.77,0.77": inspectKeyframes_mac10,
      "0.73,0.64,0.73": inspectKeyframes_ar9,
      "0.11,0.10,0.10": inspectKeyframes_m60,
      "0.84,0.84,0.84": inspectKeyframes_vita,
      "0.77,1.01,0.77": inspectKeyframes_lar,
      "0.59,0.89,0.60": inspectKeyframes_scar,
      "0.01,0.01,0.01": inspectKeyframes_shark,
      "1.27,1.05,1.62": inspectKeyframes_knife,
      "1.45,1.26,1.29": inspectKeyframes_knife,
      "1.46,1.25,1.28": inspectKeyframes_knife,
      "1.48,1.24,1.28": inspectKeyframes_knife,
      "1.48,1.24,1.27": inspectKeyframes_knife,
      "1.49,1.23,1.27": inspectKeyframes_knife,
      "1.49,1.23,1.28": inspectKeyframes_knife,
      "1.47,1.23,1.29": inspectKeyframes_knife,
      "1.46,1.23,1.32": inspectKeyframes_knife,
      "1.43,1.23,1.34": inspectKeyframes_knife,
      "1.39,1.24,1.38": inspectKeyframes_knife,
      "1.35,1.25,1.41": inspectKeyframes_knife,
      "1.31,1.26,1.43": inspectKeyframes_knife,
      "1.28,1.27,1.45": inspectKeyframes_knife,
      "1.26,1.28,1.46": inspectKeyframes_knife,
      "1.27,1.29,1.44": inspectKeyframes_knife,
      "1.29,1.31,1.41": inspectKeyframes_knife,
      "1.33,1.31,1.37": inspectKeyframes_knife,
      "1.37,1.32,1.32": inspectKeyframes_knife,
      "1.41,1.32,1.28": inspectKeyframes_knife,
      "1.42,1.31,1.27": inspectKeyframes_knife,
      "1.41,1.29,1.30": inspectKeyframes_knife,
      "1.38,1.27,1.36": inspectKeyframes_knife,
      "1.33,1.24,1.43": inspectKeyframes_knife,
      "1.29,1.21,1.50": inspectKeyframes_knife,
      "1.27,1.17,1.54": inspectKeyframes_knife,
      "1.29,1.14,1.55": inspectKeyframes_knife,
      "1.35,1.11,1.52": inspectKeyframes_knife,
      "1.44,1.08,1.45": inspectKeyframes_knife,
      "1.54,1.06,1.37": inspectKeyframes_knife,
      "1.60,1.05,1.30": inspectKeyframes_knife,
      "1.62,1.05,1.27": inspectKeyframes_knife,
      "1.59,1.05,1.31": inspectKeyframes_knife,
      "1.51,1.05,1.40": inspectKeyframes_knife,
      "1.41,1.05,1.50": inspectKeyframes_knife,
      "1.54,0.92,2.24": inspectKeyframes_tomahawk,
    };

    const armSigs = new Set([
      "1.40,1.40,1.40",
      "1.99,1.68,2.11",
      "1.88,1.40,1.88",
      "1.11,1.11,1.77",
      "1.50,1.40,1.76",
      "1.13,0.85,1.77",
      "0.81,1.08,1.38",
      "1.52,1.15,1.61",
      "1.16,1.48,0.94",
      "1.08,1.10,1.77",
      "1.54,0.92,2.24",
    ]);

    const armKeyframeMap = {
      vita_right: armKeyframes_vita_right,
      vita_left: armKeyframes_vita_left,
      scar_right: armKeyframes_scar_right,
      scar_left: armKeyframes_scar_left,
      ar9_right: armKeyframes_ar9_right,
      ar9_left: armKeyframes_ar9_left,
      mac10_right: armKeyframes_mac10,
      mac10_left: armKeyframes_mac10,
      m60_right: armKeyframes_m60_right,
      m60_left: armKeyframes_m60_left,
      lar_right: armKeyframes_lar_right,
      lar_left: armKeyframes_lar_left,
      weatie_right: armKeyframes_weatie_right,
      weatie_left: armKeyframes_weatie_left,
      bayonet_right: armKeyframes_knife,
      bayonet_left: armKeyframes_knife,
      rev_right: armKeyframes_rev,
      shark_right: armKeyframes_shark,
    };

    const applyZSpin = (mat, angle) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const sx = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);
      const sy = Math.sqrt(mat[4] * mat[4] + mat[5] * mat[5] + mat[6] * mat[6]);
      const x0 = mat[0] / sx, x1 = mat[1] / sx, x2 = mat[2] / sx;
      const y0 = mat[4] / sy, y1 = mat[5] / sy, y2 = mat[6] / sy;
      const nx0 = x0 * cos - y0 * sin, nx1 = x1 * cos - y1 * sin, nx2 = x2 * cos - y2 * sin;
      const ny0 = x0 * sin + y0 * cos, ny1 = x1 * sin + y1 * cos, ny2 = x2 * sin + y2 * cos;
      mat[0] = nx0 * sx; mat[1] = nx1 * sx; mat[2] = nx2 * sx;
      mat[4] = ny0 * sy; mat[5] = ny1 * sy; mat[6] = ny2 * sy;
    };

    const applyXSpin = (mat, angle) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const sy = Math.sqrt(mat[4] * mat[4] + mat[5] * mat[5] + mat[6] * mat[6]);
      const sz = Math.sqrt(mat[8] * mat[8] + mat[9] * mat[9] + mat[10] * mat[10]);
      const y0 = mat[4] / sy, y1 = mat[5] / sy, y2 = mat[6] / sy;
      const z0 = mat[8] / sz, z1 = mat[9] / sz, z2 = mat[10] / sz;
      const ny0 = y0 * cos - z0 * sin, ny1 = y1 * cos - z1 * sin, ny2 = y2 * cos - z2 * sin;
      const nz0 = y0 * sin + z0 * cos, nz1 = y1 * sin + z1 * cos, nz2 = y2 * sin + z2 * cos;
      mat[4] = ny0 * sy; mat[5] = ny1 * sy; mat[6] = ny2 * sy;
      mat[8] = nz0 * sz; mat[9] = nz1 * sz; mat[10] = nz2 * sz;
    };

    const applyYSpin = (mat, angle) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const sx = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);
      const sz = Math.sqrt(mat[8] * mat[8] + mat[9] * mat[9] + mat[10] * mat[10]);
      const x0 = mat[0] / sx, x1 = mat[1] / sx, x2 = mat[2] / sx;
      const z0 = mat[8] / sz, z1 = mat[9] / sz, z2 = mat[10] / sz;
      const nx0 = x0 * cos + z0 * sin, nx1 = x1 * cos + z1 * sin, nx2 = x2 * cos + z2 * sin;
      const nz0 = -x0 * sin + z0 * cos, nz1 = -x1 * sin + z1 * cos, nz2 = -x2 * sin + z2 * cos;
      mat[0] = nx0 * sx; mat[1] = nx1 * sx; mat[2] = nx2 * sx;
      mat[8] = nz0 * sz; mat[9] = nz1 * sz; mat[10] = nz2 * sz;
    };

    let currentInspectKeybind = settings.inspect_keybind;

    const inspectKeybindHandler = (e) => {
      let inputName;
      if (e.type === "mousedown") {
        switch (e.button) {
          case 3: inputName = "MouseButton4"; break;
          case 4: inputName = "MouseButton5"; break;
          default: inputName = `MouseButton${e.button + 1}`;
        }
      } else if (e.type === "keydown") {
        inputName = e.code;
      }
      if (inputName === currentInspectKeybind) {
        if (document.querySelector(".chat input[type='text']:focus")) return;
        inspectStart = performance.now();
        inspectingWeaponId = sigToWeaponId[latchedWeaponSig] || null;
        e.preventDefault();
      }
    };

    document.addEventListener("mousedown", inspectKeybindHandler, true);
    document.addEventListener("keydown", inspectKeybindHandler, true);

    document.addEventListener("juice-settings-changed", ({ detail }) => {
      if (detail.setting === "inspect_keybind") {
        currentInspectKeybind = detail.value;
      }
    });

    const hsvToRgb = (hue) => {
      hue = ((hue % 360) + 360) % 360;
      const sector = Math.floor(hue / 60);
      const f = (hue / 60) - sector;
      const q = Math.round((1 - f) * 255);
      const t = Math.round(f * 255);
      switch (sector) {
        case 0: return [255, t, 0];
        case 1: return [q, 255, 0];
        case 2: return [0, 255, t];
        case 3: return [0, q, 255];
        case 4: return [t, 0, 255];
        default: return [255, 0, q];
      }
    };

    const colMag = (m, i) =>
      Math.sqrt(m[i] * m[i] + m[i + 1] * m[i + 1] + m[i + 2] * m[i + 2]);

    const hookedContexts = new WeakSet();
    const originalGetCtx = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const ctx = originalGetCtx.call(this, type, attrs);
      if (!ctx || (type !== "webgl" && type !== "webgl2")) return ctx;
      if (hookedContexts.has(ctx) || this.id !== "game") return ctx;
      hookedContexts.add(ctx);

      const gl = ctx;
      const matBuf = new Float32Array(16);
      const rgbPixel = new Uint8Array([255, 255, 255, 255]);

      const rgbTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, rgbTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbPixel);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, null);

      const origUniformMatrix4fv = gl.uniformMatrix4fv.bind(gl);
      const origDrawArrays = gl.drawArrays.bind(gl);
      const origDrawElements = gl.drawElements.bind(gl);
      const origBindTexture = gl.bindTexture.bind(gl);

      let activeThisFrame = false;
      let lastBoundTexture = null;
      let seenMatricesThisFrame = new Set();
      let lastFrameTime = -1;
      let currentFrameWeaponSig = null;

      let lastClearMask = 0;

      const origClear = gl.clear.bind(gl);
      gl.clear = (mask) => {
        lastClearMask = mask;
        return origClear(mask);
      };

      gl.bindTexture = (target, texture) => {
        if (target === gl.TEXTURE_2D) lastBoundTexture = texture;
        return origBindTexture(target, texture);
      };

      gl.uniformMatrix4fv = (location, transpose, data, srcOffset, srcLength) => {
        activeThisFrame = false;

        const now = performance.now();
        if (now !== lastFrameTime) {
          seenMatricesThisFrame.clear();
          currentFrameWeaponSig = null;
          lastFrameTime = now;
        }

        if (data && data.length >= 16) {
          const offset = srcOffset ?? 0;
          const slice = (offset === 0 && data.length === 16)
            ? data
            : (data.subarray ? data.subarray(offset, offset + 16) : data.slice(offset, offset + 16));

          if (
            Math.abs(slice[3]) > 0.001 ||
            Math.abs(slice[7]) > 0.001 ||
            Math.abs(slice[11]) > 0.001 ||
            Math.abs(slice[15] - 1.0) > 0.001
          ) {
            return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
          }

          const s0 = colMag(slice, 0), s1 = colMag(slice, 4), s2 = colMag(slice, 8);
          const sig = `${s0.toFixed(2)},${s1.toFixed(2)},${s2.toFixed(2)}`;

          if (sig in weaponKeyframeMap) {
            if (lastClearMask !== 256) {
              return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
            }

            const fp = `${slice[0].toFixed(3)},${slice[5].toFixed(3)},${slice[10].toFixed(3)},${slice[12].toFixed(4)},${slice[13].toFixed(4)},${slice[14].toFixed(4)}`;
            if (seenMatricesThisFrame.has(fp)) {
              return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
            }
            seenMatricesThisFrame.add(fp);

            if (sigToWeaponId[sig]) {
              currentFrameWeaponSig = sig;
              window.currentWeaponId = sigToWeaponId[sig];
            }

            const currentWeaponId = sigToWeaponId[latchedWeaponSig] || "vita";

            if (inspectStart !== null && inspectingWeaponId !== null && inspectingWeaponId !== currentWeaponId) {
              inspectStart = null;
              inspectingWeaponId = null;
            }

            const weaponCfg = window.dawnWeaponConfig?.getSettings?.(currentWeaponId) || {
              size: 1.0, offsetX: 0, offsetY: 0, offsetZ: 0
            };
            const globalCfg = window.dawnWeaponConfig || {
              wireframe: false, colorEnabled: false, rgb: false, colorHex: "#FFFFFF"
            };

            if (globalCfg.colorEnabled) {
              if (globalCfg.rgb) {
                const [r, g, b] = hsvToRgb((now / 3000) * 360);
                rgbPixel[0] = r; rgbPixel[1] = g; rgbPixel[2] = b; rgbPixel[3] = 255;
                origBindTexture(gl.TEXTURE_2D, rgbTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbPixel);
              } else {
                const hex = globalCfg.colorHex.replace("#", "");
                rgbPixel[0] = parseInt(hex.substring(0, 2), 16);
                rgbPixel[1] = parseInt(hex.substring(2, 4), 16);
                rgbPixel[2] = parseInt(hex.substring(4, 6), 16);
                rgbPixel[3] = 255;
                origBindTexture(gl.TEXTURE_2D, rgbTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbPixel);
              }
            } else if (lastBoundTexture) {
              origBindTexture(gl.TEXTURE_2D, lastBoundTexture);
            }

            if (sigToWeaponId[sig] && sig !== latchedWeaponSig) {
              latchedWeaponSig = sig;
            }
            if (sig !== settlerSig) {
              settlerSig = sig;
              settlerSince = now;
            }

            let base = weaponCfg.size ?? 1.0;
            matBuf.set(slice);
            let scale = base;
            let ox = weaponCfg.offsetX ?? 0;
            let oy = weaponCfg.offsetY ?? 0;
            let oz = weaponCfg.offsetZ ?? 0;
            let spinZAngle = 0;
            let spinXAngle = 0;
            let spinYAngle = 0;
            let baseSpinXAngle = 0;

            if (inspectStart !== null && inspectingWeaponId === null) {
              inspectingWeaponId = currentWeaponId;
            }

            if (inspectStart !== null && inspectingWeaponId === currentWeaponId) {
              const animFn = weaponKeyframeMap[sig];
              const weaponId = sigToWeaponId[sig] || currentWeaponId;
              const inspectDuration = INSPECT_DURATIONS[weaponId] ?? 1000;
              if (animFn) {
                const elapsed = now - inspectStart;
                const t = Math.min(elapsed / inspectDuration, 1.0);
                const kf = animFn(t);
                scale = base * (kf.scale ?? 1);
                ox += (kf.offsetX ?? 0) * scale;
                oy += (kf.offsetY ?? 0) * scale;
                oz += (kf.offsetZ ?? 0) * scale;
                spinZAngle = kf.spinZ ?? 0;
                spinXAngle = kf.spinX ?? 0;
                spinYAngle = kf.spinY ?? 0;
                if (t >= 1.0) {
                  inspectStart = null;
                  inspectingWeaponId = null;
                }
              } else {
                inspectStart = null;
                inspectingWeaponId = null;
              }
            }

            matBuf[0] *= scale; matBuf[1] *= scale; matBuf[2] *= scale;
            matBuf[4] *= scale; matBuf[5] *= scale; matBuf[6] *= scale;
            matBuf[8] *= scale; matBuf[9] *= scale; matBuf[10] *= scale;
            matBuf[12] += ox;
            matBuf[13] += oy;
            matBuf[14] += oz;

            if (spinZAngle !== 0) applyZSpin(matBuf, spinZAngle);
            if (baseSpinXAngle !== 0) applyXSpin(matBuf, baseSpinXAngle);
            if (spinXAngle !== 0) applyXSpin(matBuf, spinXAngle);
            if (spinYAngle !== 0) applyYSpin(matBuf, spinYAngle);

            if (globalCfg.wireframe) activeThisFrame = true;

            return origUniformMatrix4fv(location, transpose, matBuf, 0, 16);
          }

          if (armSigs.has(sig)) {
            if (lastClearMask !== 256) {
              return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
            }

            const fp = `${slice[0].toFixed(3)},${slice[5].toFixed(3)},${slice[10].toFixed(3)},${slice[12].toFixed(4)},${slice[13].toFixed(4)},${slice[14].toFixed(4)}`;
            if (seenMatricesThisFrame.has(fp)) {
              return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
            }
            seenMatricesThisFrame.add(fp);

            const currentWeaponId = sigToWeaponId[currentFrameWeaponSig] || sigToWeaponId[latchedWeaponSig] || "vita";

            const armSigToType = {
              "1.40,1.40,1.40": "right",
              "1.99,1.68,2.11": "left",
              "1.11,1.11,1.77": "right",
              "1.50,1.40,1.76": "right",
              "1.13,0.85,1.77": "left",
              "0.81,1.08,1.38": "left",
              "1.52,1.15,1.61": "right",
              "1.16,1.48,0.94": "right",
              "1.54,0.92,2.24": "right",
              "1.08,1.10,1.77": "left",
              "1.88,1.40,1.88": "left"
            };

            let armType = armSigToType[sig] || "left";

            if (armType === null) {
              return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
            }

            const armSettings = window.dawnWeaponConfig?.getArmSettings?.(currentWeaponId, armType) || {
              size: 1.0, offsetX: 0, offsetY: 0, offsetZ: 0,
              wireframe: false, colorEnabled: false, colorHex: "#FFFFFF", rgb: false
            };

            matBuf.set(slice);

            let armScale = armSettings.size ?? 1.0;
            let ox = armSettings.offsetX ?? 0;
            let oy = armSettings.offsetY ?? 0;
            let oz = armSettings.offsetZ ?? 0;

            let armSpinX = 0;
            let armSpinY = 0;
            let armSpinZ = 0;

            if (inspectStart !== null && inspectingWeaponId === currentWeaponId) {
              const armFn = armKeyframeMap[`${currentWeaponId}_${armType}`] ?? null;
              const inspectDuration = INSPECT_DURATIONS[currentWeaponId] ?? 1000;
              if (armFn !== null) {
                const elapsed = now - inspectStart;
                const t = Math.min(elapsed / inspectDuration, 1.0);
                const kf = armFn(t);
                ox += (kf.offsetX ?? 0) * armScale;
                oy += (kf.offsetY ?? 0) * armScale;
                oz += (kf.offsetZ ?? 0) * armScale;
                armSpinX = kf.spinX ?? 0;
                armSpinY = kf.spinY ?? 0;
                armSpinZ = kf.spinZ ?? 0;
              }
            }

            matBuf[0] *= armScale; matBuf[1] *= armScale; matBuf[2] *= armScale;
            matBuf[4] *= armScale; matBuf[5] *= armScale; matBuf[6] *= armScale;
            matBuf[8] *= armScale; matBuf[9] *= armScale; matBuf[10] *= armScale;
            matBuf[12] += ox;
            matBuf[13] += oy;
            matBuf[14] += oz;

            if (armSpinX !== 0) applyXSpin(matBuf, armSpinX);
            if (armSpinY !== 0) applyYSpin(matBuf, armSpinY);
            if (armSpinZ !== 0) applyZSpin(matBuf, armSpinZ);

            if (armSettings.colorEnabled) {
              if (armSettings.rgb) {
                const [r, g, b] = hsvToRgb((now / 3000) * 360);
                rgbPixel[0] = r; rgbPixel[1] = g; rgbPixel[2] = b; rgbPixel[3] = 255;
                origBindTexture(gl.TEXTURE_2D, rgbTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbPixel);
              } else {
                const hex = (armSettings.colorHex || "#FFFFFF").replace("#", "");
                rgbPixel[0] = parseInt(hex.substring(0, 2), 16);
                rgbPixel[1] = parseInt(hex.substring(2, 4), 16);
                rgbPixel[2] = parseInt(hex.substring(4, 6), 16);
                rgbPixel[3] = 255;
                origBindTexture(gl.TEXTURE_2D, rgbTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbPixel);
              }
            } else if (lastBoundTexture) {
              origBindTexture(gl.TEXTURE_2D, lastBoundTexture);
            }

            if (armSettings.wireframe) activeThisFrame = true;

            return origUniformMatrix4fv(location, transpose, matBuf, 0, 16);
          }
        }

        return origUniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
      };

      const toWireframe = (mode) =>
        (mode === gl.TRIANGLES || mode === gl.TRIANGLE_FAN || mode === gl.TRIANGLE_STRIP)
          ? gl.LINES : mode;

      gl.drawArrays = (mode, first, count) => {
        if (activeThisFrame) mode = toWireframe(mode);
        activeThisFrame = false;
        seenMatricesThisFrame.clear();
        return origDrawArrays(mode, first, count);
      };

      gl.drawElements = (mode, count, type, offset) => {
        if (activeThisFrame) mode = toWireframe(mode);
        activeThisFrame = false;
        seenMatricesThisFrame.clear();
        return origDrawElements(mode, count, type, offset);
      };

      return ctx;
    };
  }

  initWeaponMods();

  const handleLobby = () => {
    const warmupAPI = () => {
      fetch("https://kirka.onrender.com")
    }
    warmupAPI();

    initRoomPresets();
    const applyLobbyChanges = () => {
      const settings = ipcRenderer.sendSync("get-settings");

      lobbyKeybindReminder(settings);
      lobbyNews(settings);
      juiceDiscordButton();

      window.createQuickJoin = () => {
        if (!settings.quickjoin_button) return;
        const playContent = document.querySelector(".play-content")
        const playContentUp = playContent.querySelector(".play-content-up");

        const quickJoin = playContentUp.cloneNode(true);
        quickJoin.classList.add("quickjoin-container")
        quickJoin.querySelector(".create-btn")?.remove();
        quickJoin.style.marginBottom = ".5rem";

        const quickJoinBtn = quickJoin.querySelector(".join-btn");
        quickJoinBtn.id = "quickjoin-btn";
        quickJoinBtn.textContent = "QUICKJOIN";
        quickJoinBtn.title = "Join the lobby/game link from your clipboard";

        if (quickJoinBtn.dataset.listenerAttached) return;
        quickJoinBtn.dataset.listenerAttached = "true";

        quickJoinBtn.addEventListener("click", (e) => {
          e.stopPropagation();

          playContentUp.querySelector(".join-btn")?.click();

          const observer = new MutationObserver(() => {
            const input = document.querySelector("#join-modal-modal .input");
            if (input) {
              navigator.clipboard.readText().then((text) => {
                input.value = text;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                document.querySelector(".btn")?.click();
              });
              observer.disconnect();
            }
          });

          observer.observe(document.body, { childList: true, subtree: true });
        });

        playContent.insertBefore(quickJoin, playContentUp);
      }

      document.addEventListener("juice-settings-changed", ({ detail }) => {
        if (detail.setting === "quickjoin_button") {
          settings.quickjoin_button = detail.value;
          const el = document.querySelector(".quickjoin-container")
          if (el) el.remove();
          else createQuickJoin();
        }
      });

      createQuickJoin();

      const customizations = JSON.parse(
        localStorage.getItem("juice-customizations")
      );

      shortIdCard = document.querySelector(".avatar-info .username").textContent.trim().split("#")[1];
      localStorage.setItem("user-id", shortIdCard);

      const lobbyNickname = document.querySelector(
        ".team-section .heads .nickname"
      );

      const nicknames = JSON.parse(localStorage.getItem("nicknames") || "{}");
      const entry = nicknames[shortIdCard];

      if (entry?.nickname) {
        const textNode = [...lobbyNickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = entry.nickname;
      }

      window.applyUserCustomizations = () => {
        const customs = customizations?.find((c) => c.shortId === shortIdCard);
        if (!customs) return;

        if (customs.gradient) {
          lobbyNickname.style.display = "inline-block";
          lobbyNickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
          lobbyNickname.style.backgroundClip = "text";
          lobbyNickname.style.webkitBackgroundClip = "text";
          lobbyNickname.style.color = "transparent";
          lobbyNickname.style.fontWeight = "700";
          lobbyNickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
          lobbyNickname.style.display = "flex";
          lobbyNickname.style.alignItems = "flex-end";
          lobbyNickname.style.gap = "0.25rem";
          lobbyNickname.style.overflow = "unset !important";

          if (ipcRenderer.sendSync("get-settings").animations) window.applyGradientAnimation(lobbyNickname, customs);
        } else {
          lobbyNickname.style = "display: flex; align-items: flex-end; gap: 0.25rem; overflow: unset !important;";
        }

        if (lobbyNickname.querySelector(".juice-badges")) return;

        const badgesElem = document.createElement("div");
        badgesElem.style = "display: flex; gap: 0.25rem; align-items: center; width: 0;";
        badgesElem.className = "juice-badges";
        lobbyNickname.appendChild(badgesElem);

        const badgeStyle = "height: 32px; width: auto;";

        if (customs.discord) {
          const linkedBadge = document.createElement("img");
          linkedBadge.src = "https://juice.irrvlo.xyz/linked.png";
          linkedBadge.style = badgeStyle;
          badgesElem.appendChild(linkedBadge);
        }

        if (customs.booster) {
          const boosterBadge = document.createElement("img");
          boosterBadge.src = "https://juice.irrvlo.xyz/booster.png";
          boosterBadge.style = badgeStyle;
          badgesElem.appendChild(boosterBadge);
        }

        if (customs.badges && customs.badges.length) {
          customs.badges.forEach((badge) => {
            const img = document.createElement("img");

            if (badge.startsWith("/") || badge.match(/^[A-Za-z]:\\/)) {
              const filePath = badge.replace(/\\/g, "/");
              img.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
            } else {
              img.src = badge;
            }

            img.style = badgeStyle;
            badgesElem.appendChild(img);
          });
        }
      };

      window.applyClanCustomizations = () => {
        const clancustomizations = JSON.parse(localStorage.getItem("juice-clans"));
        const clan = document.querySelector(".team-section .heads .clan-tag");
        if (!clan) return;
        if (!settings.customizations) return;

        const userClan = clan.textContent.trim();
        const customs = clancustomizations.find((c) => c.clan === userClan);
        if (!customs) return;

        if (customs.gradient) {
          clan.style.display = "inline-block";
          clan.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
          clan.style.backgroundClip = "text";
          clan.style.webkitBackgroundClip = "text";
          clan.style.color = "transparent";
          clan.style.fontWeight = "700";
          clan.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

          if (ipcRenderer.sendSync("get-settings").animations) window.applyGradientAnimation(clan, customs);
        }
      };

      window.applyGradientAnimation = (element, customs) => {
        if (settings.animations && customs.animated) {
          element.style.backgroundSize = "200% 200%";
          element.style.animation = "animated-gradient 3s linear infinite";
        }
      };

      window.removeUserCustomizations = () => {
        const nickname = document.querySelectorAll(".nickname").forEach((nick) => {
          nick.style = "display: flex; align-items: flex-end; gap: 0.25rem;";
          nick.querySelector(".juice-badges")?.remove();
        });
      };

      window.removeClanCustomizations = () => {
        const clan = document.querySelectorAll(".clan-tag").forEach((cl) => {
          cl.style = "display: flex; align-items: flex-end; gap: 0.25rem;";
        });
      };

      window.removeGradientAnimations = () => {
        const nickname = document.querySelectorAll(".nickname").forEach((nick) => {
          nick.style.animation = "none";
          nick.style.backgroundSize = "100% 100%";
        });
        const clan = document.querySelectorAll(".clan-tag").forEach((cl) => {
          cl.style.animation = "none";
          cn.style.backgroundSize = "100% 100%";
        });
      }

      if (settings.customizations) applyUserCustomizations();
      if (settings.customizations) applyClanCustomizations();

      const formatMoney = (money) => {
        if (!money.dataset.formatted) {
          const formatted = parseInt(money.innerText).toLocaleString();
          money.innerHTML = money.innerHTML.replace(money.innerText, formatted);
          money.dataset.formatted = true;
        }
      };

      const formatExpValues = (expValues) => {
        if (!expValues.dataset.formatted) {
          const [current, max] = expValues.innerText.split("/");
          expValues.innerText = `${parseInt(current).toLocaleString()}/${parseInt(
            max
          ).toLocaleString()}`;
          expValues.dataset.formatted = true;
        }
      };

      const formatQuests = () => {
        const quests = document.querySelectorAll(
          ".right-interface > .quests .quest"
        );

        quests.forEach((quest) => {
          const amounts = quest.querySelectorAll(".amount");
          const progress2 = quest.querySelector(".progress2");

          if (progress2 && !progress2.dataset.formatted) {
            const [progressAmt, progressMax] = progress2.innerText.split("/");
            progress2.innerText = `${parseInt(
              progressAmt
            ).toLocaleString()}/${parseInt(progressMax).toLocaleString()}`;
            progress2.dataset.formatted = true;
          }

          amounts.forEach((amount) => {
            if (!amount.dataset.formatted) {
              const formatted = parseInt(
                amount.innerText.split(" ")[0]
              ).toLocaleString();
              amount.innerHTML = amount.innerHTML.replace(
                amount.innerText.split(" ")[0],
                formatted
              );
              amount.dataset.formatted = true;
            }
          });
        });
      };

      const interval = setInterval(() => {
        const moneys = document.querySelectorAll(".moneys > .card-cont");
        const expValues = document.querySelector(".exp-values");
        const quests = document.querySelectorAll(
          ".right-interface > .quests .quest"
        );
        const questsTabs = document.querySelector(
          ".right-interface > .quests .tabs"
        );

        if (moneys.length && expValues && quests.length && questsTabs) {
          clearInterval(interval);
          moneys.forEach(formatMoney);
          formatExpValues(expValues);
          formatQuests();

          questsTabs.addEventListener("click", formatQuests);
        }
      }, 100);
    };

    let loading = null;
    let polling = null;

    const run = () => {
      clearTimeout(loading);
      clearTimeout(polling);

      loading = setTimeout(() => {
        const tryApply = () => {
          const profile = document.querySelector(".avatar-info .username");
          if (profile) {
            applyLobbyChanges();
          } else {
            polling = setTimeout(tryApply, 10);
          }
        };
        tryApply();
      }, 0);
    };

    run();
  };

  const handleServers = async () => {
    const settings = ipcRenderer.sendSync("get-settings");

    const mapImages = await fetch(
      "https://raw.githubusercontent.com/AwesomeSam9523/KirkaSkins/refs/heads/main/maps/full_mapimages.json"
    ).then((res) => res.json());

    for (const key of Object.keys(mapImages)) {
      if (!mapImages[key].includes("https")) {
        mapImages[key] = "https://raw.githubusercontent.com/AwesomeSam9523/KirkaSkins/main" + mapImages[key];
      }
    }

    const replaceMapImages = () => {
      if (!settings.map_backgrounds) return;
      const servers = document.querySelectorAll(".server");
      for (const server of servers) {
        const mapEl = server.querySelector(".map");
        if (!mapEl) continue;
        const mapName = mapEl.textContent?.split("_").pop() || "";
        if (mapImages[mapName]) {
          server.style.backgroundImage = `url(${mapImages[mapName]})`;
          server.style.backgroundSize = "cover";
          server.style.backgroundPosition = "center";
        } else {
          server.style.backgroundImage = "none";
        }
      }
    };

    replaceMapImages();

    const observer = new MutationObserver(() => {
      if (!window.location.href.startsWith(base_url + "servers/") || !settings.map_backgrounds) {
        observer.disconnect();
        return;
      }
      replaceMapImages();
    });

    const serverList = document.querySelector(".servers-list") || document.body;
    observer.observe(serverList, { childList: true, subtree: true });

    function addSpectateButton(server) {
      const joinBtn = server.querySelector(".button.join");
      const joinText = joinBtn.querySelector(".text");
      const spectateBtn = document.querySelector(".img-bg .spectate-btn");

      if (joinText.innerHTML === "spec") return;
      joinText.innerHTML = "spec";
      joinBtn.style.filter = "grayscale(0.8)"

      if (joinBtn._clickHandler) {
        joinBtn.removeEventListener("click", joinBtn._clickHandler);
      }

      joinBtn._clickHandler = () => spectateBtn.click();
      joinBtn.addEventListener("click", joinBtn._clickHandler);
    }

    function removeSpectateButton(server) {
      const joinBtn = server.querySelector(".button.join");
      const joinText = joinBtn.querySelector(".text");

      joinText.innerHTML = "join";
      joinBtn.style.filter = "none"

      if (joinBtn._clickHandler) {
        joinBtn.removeEventListener("click", joinBtn._clickHandler);
        delete joinBtn._clickHandler;
      }
    }

    if (serverList) {
      document.querySelectorAll(".server").forEach((server) => {
        if (server.classList.contains("is-locked") && settings.spectate_full_games) addSpectateButton(server);
        else removeSpectateButton(server);
      })

      new MutationObserver(() => {
        document.querySelectorAll(".server").forEach((server) => {
          if (server.classList.contains("is-locked") && settings.spectate_full_games) addSpectateButton(server);
          else removeSpectateButton(server);
        })
      }).observe(document.querySelector(".servers .list-cont>.list"), { childList: true, characterData: true })
    }

    if (!window.servers) {
      window.servers = true;

      document.addEventListener("click", (e) => {
        if (e.shiftKey && e.target.classList.contains("author-name")) {
          setTimeout(() => {
            navigator.clipboard.readText().then((text) => {
              window.location.href = `${base_url}profile/${text.replace("#", "")}`;
              const username = e.target.innerText.replace(":", "");
              customNotification({
                message: `Loading ${username}${text}'s profile...`,
              });
            });
          }, 250);
        }
      });

      document.addEventListener("click", (e) => {
        if (e.ctrlKey && e.target.classList.contains("author-name")) {
          setTimeout(() => {
            const shortId = navigator.clipboard.readText();
            const username = e.target.innerText.replace(":", "");
            navigator.clipboard.readText().then((text) => {
              customNotification({
                message: `"${username}${text}" copied to clipboard!`,
              });
              clipboard.writeText(username + text);
            });
          }, 250);
        }
      });
    }

    const input = document.querySelector(".servers .chat .input");
    const sendBtn = document.querySelector(".servers .chat .enter");

    const createTradeButtons = () => {
      const chatLabel = document.querySelector(".servers .chat-label");
      if (!chatLabel) return;
      if (chatLabel.parentElement.querySelector(".trade-buttons")) return;

      const container = document.createElement("div");
      container.className = "trade-buttons";
      container.style = "display: flex; gap: 0.5rem; margin-left: 1rem;";

      const makeDivButton = (label, bg, borderTop, borderBottom) => {
        const div = document.createElement("div");
        div.innerText = label.toUpperCase();
        div.style = `
          cursor: pointer;
          user-select: none;
          padding: 0.2rem 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: center;
          color: white;
          text-shadow: -1px -1px 0 #000, 1px -1px 0px #000, -1px 1px 1px #000, 2px 2px 0 #000;
          background: ${bg};
          border: 1px solid black;
          border-top: 3px solid ${borderTop};
          border-bottom: 3px solid ${borderBottom};
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.3s ease, opacity 0.1s ease;
        `;
        div.addEventListener("mousedown", () => {
          div.style.transform = "scale(0.95)";
          div.style.opacity = "0.85";
        });
        document.addEventListener("mouseup", () => {
          div.style.transform = "scale(1)";
          div.style.opacity = "1";
        });
        div.addEventListener("mouseenter", () => {
          div.style.background = `${borderTop}`;
        });
        div.addEventListener("mouseleave", () => {
          div.style.background = `${bg}`;
        });
        return div;
      };

      const offerDiv = makeDivButton("Offer", "#3b82f6", "#60a5fa", "#1d4ed8");
      offerDiv.addEventListener("click", () => {
        if (!input) return;
        input.value = "/trade offer my:[] your:[]";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      const sendMessage = (text) => {
        if (!input || !sendBtn) return;
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        sendBtn.click();
      };

      const bumpDiv = makeDivButton("Bump", "#10b981", "#34d399", "#047857");
      bumpDiv.addEventListener("click", () => {
        sendMessage("/trade bump");
      });

      const cancelDiv = makeDivButton("Cancel", "#ef4444", "#f87171", "#991b1b");
      cancelDiv.addEventListener("click", () => {
        sendMessage("/trade cancel");
      });

      container.appendChild(offerDiv);
      container.appendChild(bumpDiv);
      container.appendChild(cancelDiv);

      chatLabel.insertAdjacentElement("afterend", container);
    }

    if (settings.show_trade_buttons) createTradeButtons();

    if (settings.accept_on_click) {
      const tradeElem = e.target.closest(".servers .trade");
      const tradeButtonElem = e.target.closest(".servers .trade .button");
      if (!tradeElem) return;
      if (tradeButtonElem) return;

      const boldText = tradeElem.querySelector(".bold");
      if (!boldText) return;

      const text = boldText.innerText;
      const match = text.match(/\/trade accept (\d+)/);
      if (!match) return;

      const tradeId = match[1];
      selectedTradeId = tradeId;

      tradeElem.classList.add("selected");

      if (!input || !sendBtn) return;

      input.value = `/trade accept ${tradeId}`;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      sendBtn.click();
    }

    let lastValue = "";
    input.addEventListener("input", () => {
      lastValue = input.value;
    });

    const commandMap = {
      "/t": "/trade",
      "/cw": "/confirmwager",
      "/w": "/wager",
      "/cl": "/claim",
      "/p": "/price",
      "/cf": "/coinflip",
      "/i": "/inventory",
      "/inv": "/inventory",
    };

    const subCommandMap = {
      "a": "accept",
      "acc": "accept",
      "c": "cancel",
      "ca": "cancel",
      "co": "confirm",
      "conf": "confirm",
      "b": "bump",
      "o": "offer",
    };

    const setInputValue = (value, cursorPos) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      nativeSetter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      if (cursorPos != null) {
        input.setSelectionRange(cursorPos, cursorPos);
      }
    };

    input.addEventListener("input", (e) => {
      if (!ipcRenderer.sendSync("get-settings").command_abbreviations) return;
      if (e.inputType && e.inputType.startsWith("delete")) return;
      const text = input.value;

      const match = text.match(/^(\S*)(\s*)(\S*)(\s*)(.*)$/);
      if (!match) return;

      let [, cmd, space1, sub, space2, rest] = match;
      let changed = false;

      if (commandMap[cmd] && (!(ipcRenderer.sendSync("get-settings").abbreviation_confirmation) || space1.length > 0)) {
        cmd = commandMap[cmd];
        changed = true;
      }

      if (subCommandMap[sub] && (!(ipcRenderer.sendSync("get-settings").abbreviation_confirmation) || space2.length > 0)) {
        sub = subCommandMap[sub];
        changed = true;
      }

      if (!changed) return;

      const newText = cmd + space1 + sub + space2 + rest;
      if (newText !== text) {
        const cursorPos = input.selectionStart;
        const diff = newText.length - text.length;
        setInputValue(newText, cursorPos + diff);
      }
    });
  };

  let disconnectObservers = () => { };

  const handleProfile = () => {
    disconnectObservers();

    const settings = ipcRenderer.sendSync("get-settings");

    const addNicknameButton = () => {
      const profile = document.querySelector(".tab-content > .profile-cont > .profile");
      const shortId = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim().split("#")[1];
      if (!profile || !shortId) return;
      const nicknameDiv = document.createElement("div");
      nicknameDiv.className = "edit-nickname";
      nicknameDiv.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Nickname';
      nicknameDiv.addEventListener("click", (e) => {
        const nickname = profile.querySelector(".nickname");

        const overlay = document.createElement("div");
        overlay.className = "nickname-overlay";

        const modal = document.createElement("div");
        modal.className = "nickname-modal";

        const header = document.createElement("h2");
        header.textContent = "CHANGE NICKNAME";
        header.className = "nickname-header";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "nickname-input";
        input.maxLength = 20;

        const applyBtn = document.createElement("button");
        applyBtn.innerHTML = `APPLY<span style="font-size:0.65em;font-weight:normal;opacity:0.75;line-height:1.2;">Reloads Client</span>`;
        applyBtn.className = "nickname-apply-btn";

        const nicknames = JSON.parse(localStorage.getItem("nicknames") || "{}");
        const existingEntry = nicknames[shortId];
        const rawUsername = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim();
        const originalName = existingEntry?.original || rawUsername?.split("#")[0].trim() || nickname.textContent.trim();
        input.placeholder = originalName;

        const closeModal = () => {
          overlay.classList.remove("visible");
          overlay.addEventListener("transitionend", () => {
            overlay.remove();
          }, { once: true });
        };

        const resetNickname = () => {
          delete nicknames[shortId];
          localStorage.setItem("nicknames", JSON.stringify(nicknames));
          closeModal();
          window.location.reload();
        };

        applyBtn.addEventListener("click", () => {
          const newName = input.value.trim();
          if (!newName) {
            resetNickname();
            return;
          }
          nicknames[shortId] = { original: originalName, nickname: newName };
          localStorage.setItem("nicknames", JSON.stringify(nicknames));
          closeModal();
          window.location.reload();
        });

        const closeBtn = document.createElement("button");
        closeBtn.className = "nickname-close-btn";
        closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon svg-icon--__close__"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/img/icons.8d8d28b5.svg#__close__"></use></svg>`;

        closeBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) closeModal();
        });

        modal.appendChild(closeBtn);
        modal.appendChild(header);
        modal.appendChild(input);
        modal.appendChild(applyBtn);
        overlay.appendChild(modal);
        document.querySelector("#app").appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("visible"));
        input.focus();
      });
      profile.appendChild(nicknameDiv);
    };

    const applyCardChanges = () => {
      const profile = document.querySelector(".tab-content > .profile-cont > .profile");
      if (!profile) return;

      const statistics = profile.querySelectorAll(".statistic");
      const progressExp = profile.querySelector(".progress-exp");

      const formatRate = (val) => {
        return val.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%";
      };

      if (progressExp) {
        const [current, max] = progressExp.innerText.split("/");
        const c = Number(current.replace(/[^\d]/g, ""));
        const m = Number(max.replace(/[^\d]/g, ""));
        if (Number.isFinite(c) && Number.isFinite(m)) {
          progressExp.innerText = `${c.toLocaleString()}/${m.toLocaleString()}`;
        }
      }

      let games = null;
      let wins = null;
      let kills = null;
      let headshots = null;

      const statMap = {};

      statistics.forEach(stat => {
        const name = stat.querySelector(".stat-name")?.innerText?.toLowerCase();
        const valueElem = stat.querySelector(".stat-value");
        if (!name || !valueElem) return;

        const rawText = valueElem.innerText.split(" ")[0];
        const num = Number(rawText.replace(/,/g, "").replace(/[^\d.]/g, ""));
        if (!Number.isFinite(num)) return;

        const trailingText = valueElem.innerText.slice(rawText.length);
        statMap[name] = { stat, valueElem, num };
        valueElem.innerText = num.toLocaleString() + trailingText;
      });

      games = statMap.games?.num ?? statMap.played?.num ?? null;
      wins = statMap.win?.num ?? statMap.won?.num ?? null;
      kills = statMap.kills?.num ?? null;
      headshots = statMap.headshots?.num ?? null;

      if (wins !== null && games !== null && games > 0) {
        const rate = formatRate((wins / games) * 100);
        const elem = statMap.win?.valueElem || statMap.won?.valueElem;
        if (elem) {
          elem.innerHTML += ` <span class="winrate">${rate}</span>`;
        }
      }

      if (headshots !== null && kills !== null && kills > 0) {
        const rate = formatRate((headshots / kills) * 100);
        const elem = statMap.headshots?.valueElem;
        if (elem) {
          elem.innerHTML += ` <span class="headshotpercentage">${rate}</span>`;
        }
      }
    };

    const applyCustomizations = () => {
      const profile = document.querySelector(".tab-content > .profile-cont > .profile");
      const shortId = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim().split("#")[1];
      const userClan = profile.querySelector(".clan-tag")?.textContent.trim();
      const content = profile.querySelector(".profile > .content");
      const nickname = profile.querySelector(".nickname");

      if (!nickname) return;

      const nicknames = JSON.parse(localStorage.getItem("nicknames") || "{}");
      const entry = nicknames[shortId];

      if (entry?.nickname) {
        const textNode = [...nickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = entry.nickname;
      }

      if (settings.customizations) {
        const clan = profile.querySelector(".clan-tag");
        profile.querySelector(".you").style = "width: 100%";
        nickname.style.cssText +=
          "display: flex; align-items: flex-end; gap: 0.25rem; overflow: unset !important;";
        profile.style = "width: unset; min-width: 60rem;";
        if (content) content.style = "width: 36.5rem; flex-shrink: 0;";

        const textNode = nickname.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const span = document.createElement("span");
          span.className = "nickname-span";
          span.textContent = textNode.textContent;
          nickname.replaceChild(span, textNode);
        }

        let badgesElem = null;

        if (!badgesElem) {
          badgesElem = document.createElement("div");
          badgesElem.style = "display: flex; gap: 0.25rem; align-items: center;";
          badgesElem.className = "juice-badges";
          nickname.appendChild(badgesElem);
        } else {
          badgesElem.innerHTML = "";
        }

        const customizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
        const clancustomizations = JSON.parse(localStorage.getItem("juice-clans") || "[]");

        const customs = customizations.find((c) => c.shortId === shortId);

        const currentUser = JSON.parse(localStorage.getItem("current-user"));
        const isOwnProfile = currentUser && currentUser.shortId === shortId;

        const savedGradient = JSON.parse(localStorage.getItem("gradientSettings") || "null");
        const savedBadges = JSON.parse(localStorage.getItem("badgeSettings") || "null");
        const savedShadow = JSON.parse(localStorage.getItem("gradientShadowSettings") || "null");

        const gradientData = customs?.gradient || (settings.local_customizations && isOwnProfile && savedGradient ? {
          rot: `${savedGradient.rotation}deg`,
          stops: savedGradient.colors.map(c => c.hex),
          shadow: savedShadow ? (savedShadow.intensity > 0 ? `0px 0px ${savedShadow.intensity}px ${savedShadow.color}` : "none") : "none"
        } : null);

        const badgesData = customs?.badges || (settings.local_customizations && isOwnProfile ? savedBadges : null) || [];
        const isAnimated = customs?.animated ?? false;
        const bgUrl = customs?.["profile-background"] || (settings.local_customizations && isOwnProfile ? localStorage.getItem("backgroundSettings") : null);

        if (customs || (isOwnProfile && (savedGradient || savedBadges || bgUrl))) {
          const span = nickname.querySelector(".nickname-span");

          if (gradientData && span) {
            span.style.display = "inline-block";
            span.style.background = `linear-gradient(${gradientData.rot}, ${gradientData.stops.join(", ")})`;
            span.style.backgroundClip = "text";
            span.style.webkitBackgroundClip = "text";
            span.style.color = "transparent";
            span.style.fontWeight = "700";
            span.style.textShadow = gradientData.shadow || "0 0 0 transparent";

            if (settings.animations && isAnimated) {
              span.style.backgroundSize = "200% 200%";
              span.style.animation = "animated-gradient 3s linear infinite";
            }
          }

          if (bgUrl) {
            document.querySelector(".profile-cont .profile").style.cssText = `
              width: unset;
              min-width: 60rem;
              background: url("${bgUrl}") no-repeat center / cover;
              box-shadow: inset 0 1px 0 5px rgba(0, 0, 0, 0.5),
                          inset 0 6px 0 -5px rgba(0, 0, 0, 0.5);
            `;
            document.querySelectorAll(".profile-cont .card").forEach(card => {
              card.style.cssText = `
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.18);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6);
              `;
            });
          }

          if (badgesData.length) {
            badgesData.forEach((badge) => {
              const img = document.createElement("img");

              if (badge.startsWith("/") || badge.match(/^[A-Za-z]:\\/)) {
                const filePath = badge.replace(/\\/g, "/");
                img.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
              } else {
                img.src = badge;
              }

              img.style = "height: 32px; width: auto;";
              badgesElem.appendChild(img);
            });
          }
        }

        if (clancustomizations.find((c) => c.clan === userClan) && settings.customizations) {
          const customs = clancustomizations.find((c) => c.clan === userClan);

          if (customs.gradient) {
            clan.style.display = "inline-block";
            clan.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
            clan.style.backgroundClip = "text";
            clan.style.webkitBackgroundClip = "text";
            clan.style.color = "transparent";
            clan.style.fontWeight = "700";
            clan.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

            if (settings.animations && customs.animated) {
              clan.style.backgroundSize = "200% 200%";
              clan.style.animation = "animated-gradient 3s linear infinite";
            }
          }
        }
      }
    };
    self.applyCustomizations = applyCustomizations;

    let loading = null;
    let polling = null;

    const run = () => {
      clearTimeout(loading);
      clearTimeout(polling);

      loading = setTimeout(() => {
        const tryApply = () => {
          const profile = document.querySelector(".tab-content .statistics");
          if (profile) {
            const profileCont = document.querySelector(".tab-content > .profile-cont > .profile");
            if (profileCont?.dataset.applied) return;
            if (profileCont) profileCont.dataset.applied = "true";
            addNicknameButton();
            applyCustomizations();
            applyCardChanges();
          } else {
            polling = setTimeout(tryApply, 10);
          }
        };
        tryApply();
      }, 0);
    };

    run();

    const obs = observeForElement(".tab-content", run);

    disconnectObservers = () => {
      obs?.disconnect();
    }
  };

  const handleInGame = () => {
    let settings = ipcRenderer.sendSync("get-settings");
    const nicknames = JSON.parse(localStorage.getItem("nicknames") || "{}");

    setAdsPower(settings.ads_power);

    let red_players = [];
    let blue_players = [];
    let dm_players = [];

    const playerCache = new Map();

    const nicknameByOriginal = new Map();
    const nicknameByNickname = new Map();
    Object.entries(nicknames).forEach(([shortId, entry]) => {
      if (entry.original) nicknameByOriginal.set(entry.original, { ...entry, shortId });
      if (entry.nickname) nicknameByNickname.set(entry.nickname, { ...entry, shortId });
    });

    const updatePlayerLists = () => {
      red_players = [];
      blue_players = [];
      dm_players = [];

      const process = (conts, list) => {
        conts.forEach((player) => {
          const nicknameEl = player.querySelector(".nickname");
          const shortIdEl = player.querySelector(".short-id");
          const shortId = shortIdEl?.innerText.replace("#", "");
          const rawName = nicknameEl?.innerText.trim();
          if (!nicknameEl || !rawName) return;

          const entry = shortId ? nicknames[shortId] : undefined;
          const displayName = entry?.original || rawName;

          const p = {
            display: displayName,
            original: displayName,
            shortId: shortId || null,
            nickname: entry?.nickname,
            isBot: !shortId
          };

          list.push(p);
          playerCache.set(rawName, p);
          if (shortId) {
            playerCache.set(shortId, p);
            if (entry?.nickname) playerCache.set(entry.nickname, p);
          }
        });
      };

      process(document.querySelectorAll(".desktop-game-interface .player-left-cont .player-cont"), red_players);
      process(document.querySelectorAll(".desktop-game-interface .player-right-cont .player-cont"), blue_players);
      process(document.querySelectorAll(".desktop-game-interface .tab-info .player-cont"), dm_players);
    };

    const findPlayer = (name) => {
      if (!name) return undefined;
      const all = [...red_players, ...blue_players, ...dm_players];
      const fromList = all.find(p => p.display === name || p.original === name || p.nickname === name)
        ?? playerCache.get(name);
      if (fromList) return fromList;
      const entry = nicknameByOriginal.get(name) ?? nicknameByNickname.get(name);
      if (entry) return { display: name, original: entry.original, shortId: entry.shortId, nickname: entry.nickname };
      return undefined;
    };

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const setDisplay = (el, text) => {
      let overlay = el.querySelector(".juice-nickname-overlay");
      if (overlay) {
        if (overlay.innerText === text) return;
        overlay.innerText = text;
      } else {
        overlay = document.createElement("span");
        overlay.className = "juice-nickname-overlay";
        overlay.style.cssText = "white-space:nowrap;line-height:inherit;font-family:inherit;font-weight:inherit;font-size:1.2rem;display:inline;";
        overlay.innerText = text;
        el.appendChild(overlay);
      }
      if (el.style.fontSize !== "0px") el.style.fontSize = "0";
    };

    const clearDisplay = (el) => {
      const overlay = el.querySelector(".juice-nickname-overlay");
      if (overlay) overlay.remove();
      if (el.style.fontSize) el.style.fontSize = "";
    };

    const updateKillFeed = () => {
      if (!settings.colored_killfeed) return;
      const killBarItems = document.querySelectorAll(".desktop-game-interface .kill-bar-cont .kill-bar-item");

      killBarItems.forEach((item) => {
        const killer = item.querySelector(".killer-name");
        const victim = item.querySelector(".name-kill");

        item.classList.remove("red", "blue");

        if (killer) {
          clearDisplay(killer);
          const currentText = killer.innerText.trim();
          const match = findPlayer(currentText);
          if (match) {
            if (red_players.includes(match)) item.classList.add("red");
            else if (blue_players.includes(match)) item.classList.add("blue");
            if (match.nickname) setDisplay(killer, match.nickname);
          }
        }

        if (victim) {
          clearDisplay(victim);
          const currentText = victim.innerText.trim();
          const match = findPlayer(currentText);
          if (match?.nickname) setDisplay(victim, match.nickname);
        }
      });
    };

    const processMessage = (message) => {
      const body = message.querySelector(".text");
      if (!body) return;

      const classes = [...body.classList];
      const typeClass = classes.find(c => c !== "text");
      if (!typeClass) return;

      const author = message.querySelector(".author-name");

      if (typeClass === "SERVER" || typeClass === "ERROR") {
        if (author) clearDisplay(author);
        if (typeClass === "SERVER") {
          const textNode = [...body.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
          if (!textNode) return;

          let text = textNode.textContent;
          Object.entries(nicknames).forEach(([shortId, entry]) => {
            if (!entry.nickname || !entry.original) return;
            const originalPattern = new RegExp(escapeRegex(entry.original) + "#" + shortId, "g");
            const nicknamePattern = new RegExp(escapeRegex(entry.nickname) + "#" + shortId, "g");
            text = text.replace(nicknamePattern, `${entry.original}#${shortId}`);
            text = text.replace(originalPattern, `${entry.nickname}#${shortId}`);
          });

          if (text !== textNode.textContent) textNode.textContent = text;
        }
        return;
      }

      if (typeClass === "JOIN" || typeClass === "LEAVE") {
        const textNode = [...body.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (!textNode) return;
        const suffix = typeClass === "JOIN" ? " joined the game" : " left the game";
        const name = textNode.textContent.replace(suffix, "").trim();
        const match = findPlayer(name);
        if (match?.nickname && textNode.textContent !== (match.nickname + suffix)) {
          textNode.textContent = match.nickname + suffix;
        }
        return;
      }

      if (!message.querySelector(".lvl")) return;
      if (!author) return;

      const match = findPlayer(typeClass);
      if (match?.nickname) setDisplay(author, match.nickname + ":\u00A0\u00A0");
      else clearDisplay(author);
    };

    const updateMessages = () => {
      document.querySelectorAll(".desktop-game-interface .messages-cont .message").forEach(processMessage);
    };

    let updatingEndModal = false;
    const updateEndModal = () => {
      if (updatingEndModal) return;
      updatingEndModal = true;

      try {
        const leaderNicknames = document.querySelectorAll(".end-modal .leaders .nickname");
        leaderNicknames.forEach((el) => {
          const raw = el.innerText.trim();
          const match = findPlayer(raw);
          if (match?.nickname) setDisplay(el, match.nickname);
          else clearDisplay(el);
        });

        const playerNicknames = document.querySelectorAll(".end-modal .player-cont .nickname");
        playerNicknames.forEach((el) => {
          const raw = el.innerText.trim();
          const stripped = raw.replace(/^\(\d+\)\s*/, "");
          const match = findPlayer(stripped);
          if (match?.nickname) setDisplay(el, `(${raw.match(/^\((\d+)\)/)?.[1]}) ${match.nickname}`);
          else clearDisplay(el);
        });

        const chatCont = document.querySelector(".end-modal .messages-cont");
        if (chatCont) {
          const observedEndMessages = new WeakSet();

          const observeEndMessage = (message) => {
            if (observedEndMessages.has(message)) {
              processMessage(message);
              return;
            }
            observedEndMessages.add(message);

            new MutationObserver(() => {
              if (!settings.customizations) return;
              processMessage(message);
            }).observe(message, { childList: true });

            const body = message.querySelector(".text");
            if (body) {
              new MutationObserver(() => {
                if (!settings.customizations) return;
                processMessage(message);
              }).observe(body, {
                attributes: true,
                attributeFilter: ["class"],
                childList: true,
                characterData: true,
                subtree: true
              });
            }

            processMessage(message);
          };

          chatCont.querySelectorAll(".message").forEach(observeEndMessage);

          new MutationObserver((mutations) => {
            if (!settings.customizations) return;
            for (const mutation of mutations) {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE || !node.classList.contains("message")) return;
                observeEndMessage(node);
              });
            }
          }).observe(chatCont, { childList: true });
        }
      } finally {
        updatingEndModal = false;
      }
    };

    const updateDeathCont = () => {
      const deathCont = document.querySelector(".death-cont")
      if (!deathCont) return;

      const nickname = deathCont.querySelector(".nickname");
      const textNode = [...nickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      console.log(textNode.textContent)
      const userClan = deathCont.querySelector(".killer-clan")?.textContent.trim();
      const shortIdElem = deathCont.querySelector(".short-id");
      const shortId = deathCont.querySelector(".short-id")?.textContent.trim().split("#")[1];
      const entry = nicknames[shortId];

      if (entry?.nickname && nickname) {
        if (textNode && textNode.textContent !== entry.nickname) {
          textNode.textContent = entry.nickname;
        }
      }

      const applyCustomizations = () => {
        if (!settings.customizations) return;

        const customizations = JSON.parse(localStorage.getItem("juice-customizations") || "[]");
        const clancustomizations = JSON.parse(localStorage.getItem("juice-clans") || "[]");

        const customs = customizations?.find((c) => c.shortId === shortId);
        const clanCustoms = clancustomizations?.find((c) => c.clan === userClan);

        if (customs) {
          nickname.querySelector(".juice-badges")?.remove();

          const badgesElem = document.createElement("div");
          badgesElem.style = "display: flex; gap: 0.25rem; align-items: center;";
          badgesElem.className = "juice-badges";

          if (customs.gradient) {
            nickname.style.display = "flex";
            nickname.style.alignItems = "flex-end";
            nickname.style.gap = "0.25rem";
            nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
            nickname.style.backgroundClip = "text";
            nickname.style.webkitBackgroundClip = "text";
            nickname.style.color = "transparent";
            nickname.style.fontWeight = "700";
            nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

            shortIdElem.style.background = "none";
            shortIdElem.style.webkitBackgroundClip = "unset";
            shortIdElem.style.backgroundClip = "unset";
            shortIdElem.style.color = "white";
            shortIdElem.style.textShadow = "-1px -1px 0 #0f0f0f, 1px -1px 0 #0f0f0f, -1px 1px 0 #0f0f0f, 1px 1px 0 #0f0f0f";

            if (settings.animations && customs.animated) {
              nickname.style.backgroundSize = "200% 200%";
              nickname.style.animation = "animated-gradient 3s linear infinite";
            }
          }

          const badgeStyle = "height: 24px; width: auto;";

          if (customs.badges?.length) {
            customs.badges.forEach((badge) => {
              const img = document.createElement("img");
              if (badge.startsWith("/") || badge.match(/^[A-Za-z]:\\/)) {
                const filePath = badge.replace(/\\/g, "/");
                img.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
              } else {
                img.src = badge;
              }
              img.style.cssText = badgeStyle;
              badgesElem.appendChild(img);
            });
          }

          nickname.insertBefore(badgesElem, shortIdElem);
        } else {
          nickname.style = "";
          nickname.querySelector(".juice-badges")?.remove();
        }

        const clanElem = deathCont.querySelector(".killer-clan");
        if (clanElem && clanCustoms?.gradient) {
          clanElem.style.display = "flex";
          clanElem.style.background = `linear-gradient(${clanCustoms.gradient.rot}, ${clanCustoms.gradient.stops.join(", ")})`;
          clanElem.style.backgroundClip = "text";
          clanElem.style.webkitBackgroundClip = "text";
          clanElem.style.color = "transparent";
          clanElem.style.fontWeight = "700";
          clanElem.style.textShadow = clanCustoms.gradient.shadow || "0 0 0 transparent";

          if (settings.animations && clanCustoms.animated) {
            clanElem.style.backgroundSize = "200% 200%";
            clanElem.style.animation = "animated-gradient 3s linear infinite";
          }
        }
      };

      applyCustomizations();
    };

    const spectatingObservers = [];
    let updatingSpectating = false;

    const updateSpectating = () => {
      if (updatingSpectating) return;
      updatingSpectating = true;

      try {
        spectatingObservers.forEach(o => o.disconnect());

        const fpsElems = document.querySelectorAll(".infos .fps");
        fpsElems.forEach((fpsElem) => {
          const fullText = fpsElem.textContent.trim();
          const match = fullText.match(/#([A-Z0-9]+)/);
          if (!match) return;

          const shortId = match[1];
          const entry = nicknames[shortId];
          if (!entry?.nickname) return;

          const textNode = [...fpsElem.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
          if (textNode) {
            const nextText = textNode.textContent.replace(/\S+#[A-Z0-9]+/, `${entry.nickname}#${shortId}`);
            if (textNode.textContent !== nextText) {
              textNode.textContent = nextText;
            }
          }
        });

        const infosElems = document.querySelectorAll(".infos");
        spectatingObservers.forEach(o => {
          infosElems.forEach(infosElem => o.observe(infosElem, { characterData: true, subtree: true, childList: true }));
        });
      } finally {
        updatingSpectating = false;
      }
    };

    const updateOverlay = () => {
      const isVisible = !!document.querySelector("#overlay #fps")?.textContent.trim();
      const teamPlayersState = document.querySelector(".team-players-state");
      if (!teamPlayersState) return;
      teamPlayersState.style.visibility = isVisible ? "hidden" : "";
    };

    const updateTeammates = () => {
      const teammates = document.querySelectorAll(".team-panel .teammate");
      teammates.forEach((teammate) => {
        const nickname = teammate.querySelector(".teammate-name");
        const shortId = teammate.querySelector(".teammate-short-id")?.textContent.trim().split("#")[1];
        const entry = nicknames[shortId];

        if (entry?.nickname && nickname) {
          const textNode = [...nickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
          if (textNode && textNode.textContent !== entry.nickname) {
            textNode.textContent = entry.nickname;
          }
        }
      });
    };

    const updateKD = () => {
      const kills = document.querySelector(".kill-death .kill");
      const deaths = document.querySelector("div > svg.icon-death")?.parentElement;
      const kd = document.querySelector(".kill-death .kd");

      if (!kills || !deaths || !kd) return;

      const killCount = parseFloat(kills.innerText);
      const deathCount = parseFloat(deaths.innerText) || 1;
      const kdRatio = parseFloat((killCount / deathCount).toFixed(2));

      const nextHtml = `<span class="kd-ratio">${kdRatio}</span> <span class="text-kd" style="font-size: 0.75rem;">K/D</span>`;
      if (kd.innerHTML !== nextHtml) {
        kd.innerHTML = nextHtml;
      }
    };

    const createKD = () => {
      if (document.querySelector(".kill-death .kd")) document.querySelector(".kill-death .kd").remove();
      const kills = document.querySelector(".kill-death .kill");
      const deaths = document.querySelector("div > svg.icon-death")?.parentElement;
      const kd = kills?.cloneNode(true);

      if (!kd) return;
      kd.classList.add("kd");
      kd.classList.remove("kill");
      kd.style.display = "flex";
      kd.style.alignItems = "center";
      kd.style.gap = "0.25rem";
      kd.innerHTML = `<span class="kd-ratio">0</span> <span class="text-kd" style="font-size: 0.75rem;">K/D</span>`;

      document.querySelector(".kill-death").insertBefore(kd, kills.parentElement.children[2]);
      kills.addEventListener("DOMSubtreeModified", updateKD);
      deaths.addEventListener("DOMSubtreeModified", updateKD);
    };

    let assistsCount = 0;

    const createAssists = () => {
      if (document.querySelector(".kill-death .assists")) return;
      const kills = document.querySelector(".kill-death .kill");
      const assists = kills?.cloneNode(true);

      if (!assists) return;
      assists.classList.add("assists");
      assists.classList.remove("kill");
      assists.style.display = "flex";
      assists.style.alignItems = "center";
      assists.style.gap = "0.25rem";

      assists.querySelector("svg").style.fill = "yellow";

      kills.parentElement.insertBefore(assists, kills.parentElement.children[3]);

      const achCont = document.querySelector(".ach-cont");
      if (achCont) {
        let lastTriggered = 0;

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            const animCont = mutation.target;
            if (
              mutation.attributeName === "class" &&
              animCont.classList.contains("slide-fade-enter-active") &&
              animCont.classList.contains("slide-fade-enter-to") &&
              animCont.querySelector(".text")?.textContent.includes("ASSIST")
            ) {
              const now = Date.now();
              if (now - lastTriggered < 200) continue;
              lastTriggered = now;

              assistsCount++;
              assists.childNodes[0].nodeValue = assistsCount;
            }
          }
        });

        observer.observe(achCont, {
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    };

    let objectivesCount = 0;

    const createObjectives = () => {
      if (document.querySelector(".kill-death .objectives")) return;
      const kills = document.querySelector(".kill-death .kill");
      const objectives = kills?.cloneNode(true);

      if (!objectives) return;
      objectives.classList.add("objectives");
      objectives.classList.remove("kill");
      objectives.style.display = "flex";
      objectives.style.alignItems = "center";
      objectives.style.gap = "0.25rem";

      const svgEl = objectives.querySelector("svg");
      const img = document.createElement("img");
      img.src = `file://${__dirname}/../assets/img/flag.png`;
      img.style.width = "1rem";
      img.style.height = "1rem";
      img.style.minWidth = "1rem";
      img.style.flexShrink = "0";
      img.style.marginLeft = ".5rem";
      svgEl.replaceWith(img);

      kills.parentElement.insertBefore(objectives, kills.parentElement.children[4]);

      const achCont = document.querySelector(".ach-cont");
      if (achCont) {
        let lastTriggered = 0;

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            const animCont = mutation.target;
            if (
              mutation.attributeName === "class" &&
              animCont.classList.contains("slide-fade-enter-active") &&
              animCont.classList.contains("slide-fade-enter-to") &&
              animCont.querySelector(".text")?.textContent.includes("POINT")
            ) {
              const now = Date.now();
              if (now - lastTriggered < 200) continue;
              lastTriggered = now;

              objectivesCount++;
              objectives.childNodes[0].nodeValue = objectivesCount;
            }
          }
        });

        observer.observe(achCont, {
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    };

    let headshotsCount = 0;

    const createHeadshots = () => {
      if (document.querySelector(".kill-death .hsp")) return;
      const kills = document.querySelector(".kill-death .kill");
      const hsp = kills?.cloneNode(true);

      if (!hsp) return;
      hsp.classList.add("hsp");
      hsp.classList.remove("kill");
      hsp.style.display = "flex";
      hsp.style.alignItems = "center";
      hsp.style.gap = "0.25rem";
      hsp.innerHTML = `<span class="hs-percentage">0</span> <span class="text-hs" style="font-size: 0.75rem;">HS%</span>`;

      kills.parentElement.insertBefore(hsp, kills.parentElement.children[5]);

      const achCont = document.querySelector(".ach-cont");
      if (achCont) {
        let lastTriggered = 0;

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            const animCont = mutation.target;
            if (
              mutation.attributeName === "class" &&
              animCont.classList.contains("slide-fade-enter-active") &&
              animCont.classList.contains("slide-fade-enter-to") &&
              animCont.querySelector(".text")?.textContent.includes("HEADSHOT") || animCont.querySelector(".text")?.textContent.includes("KILL")
            ) {
              const now = Date.now();
              if (now - lastTriggered < 200) continue;
              lastTriggered = now;

              if (animCont.querySelector(".text")?.textContent.includes("HEADSHOT")) headshotsCount++;

              const killsEl = document.querySelector(".kill-death .kill");

              if (!killsEl || !hsp) return;

              const killCount = killsEl.innerText;
              const hsPercentage = parseFloat((headshotsCount / killCount * 100)).toFixed(0);

              const nextHtml = `<span class="hs-percentage">${hsPercentage}</span> <span class="text-hs" style="font-size: 0.75rem;">HS%</span>`;
              if (hsp.innerHTML !== nextHtml) {
                hsp.innerHTML = nextHtml;
              }
            }
          }
        });

        observer.observe(achCont, {
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    };

    const customizations = JSON.parse(localStorage.getItem("juice-customizations"));
    const clancustomizations = JSON.parse(localStorage.getItem("juice-clans"));

    if (!document.querySelector(".desktop-game-interface")) {
      return;
    }

    let applyingCustomizationsTab = false;
    const applyCustomizationsTab = () => {
      if (applyingCustomizationsTab) return;
      applyingCustomizationsTab = true;

      try {
        const tabplayers = document.querySelectorAll(".desktop-game-interface .player-cont");

        if (settings.customizations) {
          tabplayers.forEach((player) => {
            const playerLeft = player.querySelector(".player-left");
            const nickname = player.querySelector(".nickname");
            const shortId = player.querySelector(".short-id")?.innerText.replace("#", "");

            if (!shortId) {
              player.querySelector(".juice-badges")?.remove();
              if (nickname) nickname.style = "";
              if (playerLeft) playerLeft.style = "";
              return;
            }

            const entry = nicknames[shortId];

            if (entry?.nickname && nickname) {
              const textNode = [...nickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
              if (textNode && textNode.textContent !== entry.nickname) textNode.textContent = entry.nickname;
            }

            const customs = customizations?.find((c) => c.shortId === shortId);

            if (customs) {
              let badgesElem = player.querySelector(".juice-badges");

              if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
                badgesElem?.remove();
                badgesElem = document.createElement("div");
                badgesElem.style = "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
                badgesElem.className = "juice-badges";
                badgesElem.dataset.shortId = shortId;

                if (nickname) nickname.style = "overflow: unset;";
                if (playerLeft) {
                  playerLeft.style = "width: 0;";
                  playerLeft.insertBefore(badgesElem, playerLeft.lastChild);
                }
              } else {
                badgesElem.innerHTML = "";
              }

              const badgeStyle = "height: 22px; width: auto;";

              if (customs.gradient && nickname) {
                nickname.style.display = "inline-block";
                nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
                nickname.style.backgroundClip = "text";
                nickname.style.webkitBackgroundClip = "text";
                nickname.style.color = "transparent";
                nickname.style.fontWeight = "700";
                nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

                if (settings.animations && customs.animated) {
                  nickname.style.backgroundSize = "200% 200%";
                  nickname.style.animation = "animated-gradient 3s linear infinite";
                }
              }

              const addBadge = (src) => {
                if (![...badgesElem.children].some((img) => img.src === src)) {
                  const img = document.createElement("img");
                  if (src.startsWith("/") || src.match(/^[A-Za-z]:\\/)) {
                    const filePath = src.replace(/\\/g, "/");
                    img.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
                  } else {
                    img.src = src;
                  }
                  img.style.cssText = badgeStyle;
                  badgesElem.appendChild(img);
                }
              };

              if (customs.discord) addBadge("https://juice.irrvlo.xyz/linked.png");
              if (customs.booster) addBadge("https://juice.irrvlo.xyz/booster.png");
              if (customs.badges?.length) {
                customs.badges.forEach((badge) => addBadge(badge));
              }
            } else {
              if (playerLeft) playerLeft.querySelector(".juice-badges")?.remove();
              if (nickname) nickname.style = "";
              if (playerLeft) playerLeft.style = "";
            }
          });
        } else {
          tabplayers.forEach((player) => {
            player.querySelector(".juice-badges")?.remove();
            const nick = player.querySelector(".nickname");
            const left = player.querySelector(".player-left");
            if (nick) nick.style = "";
            if (left) left.style = "";
          });
        }
      } finally {
        applyingCustomizationsTab = false;
      }
    };

    let escObserver = null;

    let applyingCustomizationsEsc = false;
    const applyCustomizationsEsc = () => {
      if (applyingCustomizationsEsc) return;
      applyingCustomizationsEsc = true;

      try {
        const escplayers = document.querySelectorAll(".esc-interface .player-cont");

        if (settings.customizations) {
          escplayers.forEach((player) => {
            const playerLeft = player.querySelector(".player-left");
            const playerIds = player.querySelector(".player-name");
            const nickname = playerIds?.querySelector(".nickname");
            if (!nickname) return;
            const shortId = nickname.querySelector(".short-id")?.innerText.replace("#", "");
            const shortIdElem = nickname.querySelector(".short-id");

            if (!shortId) {
              player.querySelector(".juice-badges")?.remove();
              nickname.style = "";
              if (playerLeft) playerLeft.style = "";
              return;
            }

            const entry = nicknames[shortId];

            if (entry?.nickname) {
              const textNode = [...nickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
              if (textNode && textNode.textContent !== entry.nickname) textNode.textContent = entry.nickname;
            }

            const customs = customizations?.find((c) => c.shortId === shortId);

            if (customs) {
              let badgesElem = player.querySelector(".juice-badges");

              if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
                badgesElem?.remove();
                badgesElem = document.createElement("div");
                badgesElem.style = "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
                badgesElem.className = "juice-badges";
                badgesElem.dataset.shortId = shortId;

                nickname.style = "overflow: unset;";
                if (playerLeft) playerLeft.style = "width: 0;";
                nickname.insertBefore(badgesElem, shortIdElem);
              } else {
                badgesElem.innerHTML = "";
              }

              const badgeStyle = "height: 22px; width: auto;";

              if (customs.gradient) {
                nickname.style.display = "flex";
                nickname.style.flexDirection = "row";
                nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
                nickname.style.backgroundClip = "text";
                nickname.style.webkitBackgroundClip = "text";
                nickname.style.color = "transparent";
                nickname.style.fontWeight = "700";
                nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

                if (shortIdElem) {
                  shortIdElem.style.background = "none";
                  shortIdElem.style.webkitBackgroundClip = "unset";
                  shortIdElem.style.backgroundClip = "unset";
                  shortIdElem.style.color = "";
                  shortIdElem.style.textShadow = "-1px -1px 0 #0f0f0f, 1px -1px 0 #0f0f0f, -1px 1px 0 #0f0f0f, 1px 1px 0 #0f0f0f";
                }

                if (settings.animations && customs.animated) {
                  nickname.style.backgroundSize = "200% 200%";
                  nickname.style.animation = "animated-gradient 3s linear infinite";
                }
              }

              const addBadge = (src) => {
                if (![...badgesElem.children].some((img) => img.src === src)) {
                  const img = document.createElement("img");
                  if (src.startsWith("/") || src.match(/^[A-Za-z]:\\/)) {
                    const filePath = src.replace(/\\/g, "/");
                    img.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
                  } else {
                    img.src = src;
                  }
                  img.style.cssText = badgeStyle;
                  badgesElem.appendChild(img);
                }
              };

              if (customs.discord) addBadge("https://juice.irrvlo.xyz/linked.png");
              if (customs.booster) addBadge("https://juice.irrvlo.xyz/booster.png");
              if (customs.badges?.length) {
                customs.badges.forEach((badge) => addBadge(badge));
              }
            } else {
              if (playerLeft) playerLeft.querySelector(".juice-badges")?.remove();
              nickname.style = "";
              if (playerLeft) playerLeft.style = "";
            }
          });
        } else {
          escplayers.forEach((player) => {
            player.querySelector(".juice-badges")?.remove();
            const nick = player.querySelector(".nickname");
            const left = player.querySelector(".player-left");
            if (nick) nick.style = "";
            if (left) left.style = "";
          });
        }

        if (settings.customizations) {
          escplayers.forEach((player) => {
            const playerIds = player.querySelector(".player-name");
            const clanElem = playerIds?.querySelector(".label");
            if (!clanElem) return;
            const clan = clanElem.textContent.trim();

            const customs = clancustomizations?.find((c) => c.clan === clan);

            if (customs) {
              if (customs.gradient) {
                clanElem.style.display = "flex";
                clanElem.style.flexDirection = "row";
                clanElem.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
                clanElem.style.backgroundClip = "text";
                clanElem.style.webkitBackgroundClip = "text";
                clanElem.style.color = "transparent";
                clanElem.style.fontWeight = "700";
                clanElem.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

                if (settings.animations && customs.animated) {
                  clanElem.style.backgroundSize = "200% 200%";
                  clanElem.style.animation = "animated-gradient 3s linear infinite";
                }
              }
            } else clanElem.style = "color: #af51e6;";
          });
        } else {
          escplayers.forEach((player) => {
            const clanElem = player.querySelector(".label");
            if (clanElem) clanElem.style = "color: var(--WwwmMnW-2);";
          });
        }
      } finally {
        applyingCustomizationsEsc = false;
      }

      const escPlayersList = document.querySelector(".esc-interface .player-list")

      if (escObserver) escObserver.disconnect();
      escObserver = new MutationObserver(applyCustomizationsEsc);
      if (escPlayersList) escObserver.observe(escPlayersList, { subtree: false, childList: true });
    };

    const indicators = [
      { key: "kd_indicator", selector: ".kd", create: createKD },
      { key: "assists_indicator", selector: ".assists", create: createAssists },
      { key: "points_indicator", selector: ".objectives", create: createObjectives },
      { key: "hsp_indicator", selector: ".hsp", create: createHeadshots },
    ];

    for (const { key, selector, create } of indicators) {
      const toggle = () => {
        const el = document.querySelector(`.kill-death ${selector}`);
        if (settings[key]) create();
        else if (!settings[key] && el) el.remove();
      };

      toggle();

      document.addEventListener("juice-settings-changed", ({ detail }) => {
        if (detail.setting === key) {
          settings[key] = detail.value;
          toggle();
        }
      });
    }

    const observers = new Map();
    let observingShortIds = false;

    const observeShortIds = () => {
      if (observingShortIds) return;
      observingShortIds = true;

      try {
        const tabPlayers = document.querySelectorAll(".desktop-game-interface .player-cont");
        tabPlayers.forEach(player => {
          const shortIdElem = player.querySelector(".nickname");
          if (!shortIdElem || observers.has(shortIdElem)) return;

          const obs = new MutationObserver(() => {
            observers.forEach(o => o.disconnect());
            applyCustomizationsTab();
            applyCustomizationsEsc();
            observers.forEach((o, elem) => o.observe(elem, {
              characterData: true,
              subtree: true,
              childList: true
            }));
          });

          observers.set(shortIdElem, obs);
          obs.observe(shortIdElem, {
            characterData: true,
            subtree: true,
            childList: true
          });
        });
      } finally {
        observingShortIds = false;
      }
    };

    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        observers.forEach(o => o.disconnect());
        observers.clear();
      }
    }).observe(document, { subtree: true, childList: true });

    observeShortIds();
    applyCustomizationsEsc();

    if (document.querySelector(".infos")) {
      const infosElems = document.querySelectorAll(".infos");
      infosElems.forEach((infosElem) => {
        const obs = new MutationObserver(() => updateSpectating());
        spectatingObservers.push(obs);
        obs.observe(infosElem, { characterData: true, subtree: true, childList: true });
      });
    } else {
      observeForElement(".desktop-game-interface .infos", () => {
        const infosElem = document.querySelector(".infos");
        updateSpectating();
        new MutationObserver(() => {
          updateSpectating();
        }).observe(infosElem, { characterData: true });
      });
    }

    const playerContainer = document.querySelector(".desktop-game-interface .player-list .player-cont");
    if (playerContainer) applyCustomizationsTab();

    const playerListContainerTab = document.querySelectorAll(".desktop-game-interface .player-list");
    playerListContainerTab.forEach((playerListContainer) => {
      const observerTab = new MutationObserver(() => {
        observeShortIds();
        applyCustomizationsTab();
        updatePlayerLists();
      });
      observerTab.observe(playerListContainer, { childList: true, subtree: false });
    });

    observeForElement(".esc-interface", applyCustomizationsEsc);
    observeForElement(".death-cont .user-card", updateDeathCont);
    observeForElement(".end-modal", updateEndModal, document.querySelector("#app"));

    const overlay = document.querySelector("#overlay");
    if (overlay && settings.hide_teamstate_overlay) {
      new MutationObserver(() => updateOverlay()).observe(overlay, { characterData: true, subtree: true, childList: true });
    }

    let chatObserver = null;
    let chatObserverAttached = false;

    const attachChatObserver = () => {
      if (chatObserverAttached) return;
      const chatCont = document.querySelector(".desktop-game-interface .messages-cont");
      if (!chatCont) return;
      chatObserverAttached = true;

      const observedMessages = new WeakSet();

      const observeMessage = (message) => {
        if (observedMessages.has(message)) {
          processMessage(message);
          return;
        }
        observedMessages.add(message);

        new MutationObserver(() => {
          if (!settings.customizations) return;
          processMessage(message);
        }).observe(message, { childList: true });

        const body = message.querySelector(".text");
        if (body) {
          new MutationObserver(() => {
            if (!settings.customizations) return;
            processMessage(message);
          }).observe(body, {
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
            characterData: true,
            subtree: true
          });
        }

        processMessage(message);
      };

      chatCont.querySelectorAll(".message").forEach(observeMessage);

      new MutationObserver((mutations) => {
        if (!settings.customizations) return;
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE || !node.classList.contains("message")) return;
            observeMessage(node);
          });
        }
      }).observe(chatCont, { childList: true });
    };

    const bottomLeft = document.querySelector("#bottom-left");
    if (bottomLeft) {
      new MutationObserver(() => {
        const chatCont = document.querySelector(".desktop-game-interface .messages-cont");
        if (chatCont) {
          attachChatObserver();
        } else {
          chatObserverAttached = false;
          chatObserver?.disconnect();
          chatObserver = null;
        }
      }).observe(bottomLeft, { childList: true });
    }

    const warmupTimer = document.querySelector(".warmup-timer");
    if (!warmupTimer) {
      updatePlayerLists();
      updateMessages();
      updateTeammates();
      const observeElement = (selector, setting, execute) => {
        const elem = document.querySelector(selector);
        if (!elem) return;
        new MutationObserver(() => {
          if (setting()) execute();
        }).observe(elem, { childList: true });
      };

      observeElement(".kill-bar-cont", () => settings.colored_killfeed, updateKillFeed);
      observeElement(".teammates-list", () => settings.customizations, updateTeammates);
      attachChatObserver();
      return;
    } else {
      const warmupInterval = setInterval(() => {
        if (!document.querySelector(".warmup-timer")) {
          clearInterval(warmupInterval);
          red_players = [];
          blue_players = [];
          assistsCount = 0;
          headshotsCount = 0;
          objectivesCount = 0;
          updatePlayerLists();
          updateMessages();
          updateTeammates();
          applyCustomizationsTab();
          const observeElement = (selector, setting, execute) => {
            const elem = document.querySelector(selector);
            if (!elem) return;
            new MutationObserver(() => {
              if (setting()) execute();
            }).observe(elem, { childList: true });
          };

          observeElement(".kill-bar-cont", () => settings.colored_killfeed, updateKillFeed);
          observeElement(".teammates-list", () => settings.customizations, updateTeammates);
          attachChatObserver();
        }
      }, 1000);
    }
  };

  const handleClans = () => {
    async function fetchClan(clan) {
      const clanData = await fetch(`https://kirka.onrender.com/api/clan/${encodeURIComponent(clan)}`).then((res) => res.json());
      return clanData;
    }

    function buildClanPage(data, container) {
      const sorted = [...data.members].sort((a, b) => b.monthScores - a.monthScores);

      const memberRows = sorted.map((m, i) => `
        <div data-v-45a6a849="" class="item">
          <div data-v-45a6a849="" class="number">${i + 1}</div>
          <div data-v-45a6a849="" class="item-content">
            <div data-v-45a6a849="" class="name-rang">
              <div data-v-34c14d58="" data-v-45a6a849="" class="role-select ${m.role}">
                ${m.role}
              </div>
              <div data-v-45a6a849="" class="name ${m.role === "LEADER" ? "bolder" : ""}" data-shortid="${m.user.shortId}">
                ${m.user.name}
              </div>
            </div>
            <div data-v-45a6a849="" class="stats">
              <div data-v-45a6a849="" class="stat">${m.monthScores.toLocaleString()}</div>
              <div data-v-45a6a849="" class="stat">${m.allScores.toLocaleString()}</div>
            </div>
          </div>
        </div>
      `).join("");

      container.innerHTML = `
        <div data-v-1c9e870c="" data-v-392a0664="" class="card-cont">
          <div data-v-1c9e870c="" class="clan-name text-1">${data.name}</div>
          <div data-v-1c9e870c="" class="info">
            <div data-v-1c9e870c="" class="left-info">
              <div data-v-1c9e870c="" class="champions-stat background">
                <div data-v-1c9e870c="" class="champions-labels">
                  <span data-v-1c9e870c="" class="champions-league">clan war #</span>
                  <div data-v-1c9e870c="" class="champions-scores">scores</div>
                </div>
                <div data-v-1c9e870c="" class="champions-values">
                  <div data-v-1c9e870c="">${data.currentClanWarPosition ?? "—"}</div>
                  <div data-v-1c9e870c="" class="">${(data.monthScores ?? 0).toLocaleString()}</div>
                </div>
              </div>
              <div data-v-1c9e870c="" class="all-scores background">
                <div data-v-1c9e870c="" class="all-scores-label">all scores</div>
                <div data-v-1c9e870c="" class="all-scores-value">${data.allScores.toLocaleString()}</div>
              </div>
              <div data-v-1c9e870c="" class="ranks-cont">
                <div data-v-1c9e870c="" class="ranks-label text-2">ranks:</div>
                <div data-v-1c9e870c="" class="ranks">
                  <div data-v-1c9e870c="" class="rank leader"> LEADER </div>
                  <div data-v-1c9e870c="" class="rank officer"> OFFICER </div>
                  <div data-v-1c9e870c="" class="rank newbie"> NEWBIE </div>
                </div>
              </div>
            </div>
            <div data-v-1c9e870c="" class="right-info">
              <div data-v-1c9e870c="" class="description background">${data.description ?? ""}</div>
              ${data.discordLink ? `
                <a data-v-1c9e870c="" class="discord-cont" href="${data.discordLink}" target="_blank">
                  <svg data-v-2b44d870="" data-v-1c9e870c="" xmlns="http://www.w3.org/2000/svg" class="discord-icon svg-icon svg-icon--__discord-classic__">
                    <use data-v-2b44d870="" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/img/icons.8d8d28b5.svg#__discord-classic__"></use>
                  </svg>
                  DISCORD
                </a>
              ` : "<!---->"}
            </div>
          </div>
        </div>
        <div data-v-45a6a849="" data-v-392a0664="" class="list-container">
          <div data-v-45a6a849="" class="head">
            Players
            <div data-v-45a6a849="" class="labels">
              <div data-v-45a6a849="" class="label"> scores per month </div>
              <div data-v-45a6a849="" class="label"> scores </div>
            </div>
          </div>
          <div data-v-45a6a849="" class="list">${memberRows}</div>
        </div>
      `;

      container.querySelectorAll(".name[data-shortid]").forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          window.location.href = `https://kirka.io/profile/${el.dataset.shortid}`;
        });
      });

      const listContainer = container.querySelector(".list-container");
      if (listContainer) addSorting(listContainer);

      applyClanCustomizations();
    }

    function addClanPage(clanName) {
      const pagesNav = document.querySelector(".pages-nav");
      const clansContainer = document.querySelector(".clans");

      const existingTab = pagesNav.querySelector(`.nav[data-clan="${CSS.escape(clanName)}"]`);
      if (existingTab) {
        existingTab.click();
        return;
      }

      const clanTab = document.createElement("div");
      clanTab.className = `nav other-clan`;
      clanTab.dataset.clan = clanName;
      clanTab.textContent = clanName.toUpperCase();

      const clanPage = document.createElement("div");
      clanPage.className = `other-clan-page`;
      clanPage.dataset.clan = clanName;

      const loading = document.createElement("div");
      loading.className = "clan-loading";
      loading.textContent = "LOADING...";

      let clanNotFound = false;
      setTimeout(() => {
        if (clanNotFound) return;
        if (loading) {
          loading.innerHTML = "LOADING...<span style='font-size: 50%; color: rgba(230, 224, 245, 0.5);'>This might take a second</span>";
        }
      }, 2000);

      clanTab._page = clanPage;

      fetchClan(clanName).then(data => {
        if (!data || data.error) {
          clanNotFound = true;
          loading.innerHTML = "CLAN NOT FOUND<span style='font-size: 50%; color: rgba(230, 224, 245, 0.5); display: block;'>Double-check the clan name and try again</span>";
          return;
        }
        buildClanPage(data, clanPage);
        clanPage.querySelector(".loading")?.remove();
      });

      clanPage.appendChild(loading);
      pagesNav.appendChild(clanTab);
      clansContainer.appendChild(clanPage);

      function clickClanTab() { clanTab.click() }

      pagesNav.childNodes[1].click();
      observeForElement(".my-clan", clickClanTab);
    }

    applyClanCustomizations = () => {
      const clancustomizations = JSON.parse(localStorage.getItem("juice-clans"));
      const clans = document.querySelectorAll(".clan-name");
      clans.forEach((clan) => {
        const clanName = clan.textContent.trim();
        const customs = clancustomizations.find((c) => c.clan === clanName);
        if (!customs) return;

        if (customs.gradient) {
          clan.style.display = "inline-block";
          clan.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
          clan.style.backgroundClip = "text";
          clan.style.webkitBackgroundClip = "text";
          clan.style.color = "transparent";
          clan.style.fontWeight = "700";
          clan.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

          if (settings.animations && customs.animated) {
            clan.style.backgroundSize = "200% 200%";
            clan.style.animation = "animated-gradient 3s linear infinite";
          }
        }
      })
    };

    document.querySelectorAll(".champions-list .item").forEach((clan) => {
      clan.addEventListener("click", () => {
        const clanName = clan.childNodes[0].textContent.trim();
        addClanPage(clanName);
      });
    });

    function addClanLookup() {
      const awardsCont = document.querySelector(".awards-cont");
      if (!awardsCont) return;

      const clanLookup = document.createElement("div");
      clanLookup.classList.add("clan-lookup");
      clanLookup.style = `display: flex; flex-direction: column; align-items: flex-start; margin-top: 1.5rem; margin-bottom: 30%; padding: 0 1rem;`;
      clanLookup.innerHTML = `
        <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: .5rem; width: 100%; font-size: 0.85rem;">
          <span class="lookup-text">Lookup</span>
          <span>Press Enter to lookup</span>
        </div>
        <input type="text" placeholder="ENTER CLAN NAME" class="lookup-input" style="border: .125rem solid #202639; outline: none; background: #2f3957; width: 100%; height: 2.875rem; padding-left: .5rem; box-sizing: border-box; font-weight: 600; font-size: 1rem; color: #f2f2f2; box-shadow: 0 1px 2px rgba(0,0,0,.4), inset 0 0 8px rgba(0,0,0,.4); border-radius: .25rem; transition: border-color 0.2s;"/>
      `;

      const input = clanLookup.querySelector(".lookup-input");

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const clanName = input.value.trim();
          if (clanName) addClanPage(clanName);
        }
      });

      awardsCont.prepend(clanLookup);
    }

    addClanLookup();

    document.querySelector(".pages-nav").addEventListener("click", (e) => {
      const tab = e.target.closest(".nav");
      if (!tab) return;

      const pagesNav = document.querySelector(".pages-nav");
      const clansContainer = document.querySelector(".clans");
      const championsContainer = document.querySelector(".champions-container");
      const myClanContainer = document.querySelector(".my-clan");

      pagesNav.querySelectorAll(".nav").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      clansContainer.querySelectorAll(".other-clan-page").forEach(p => p.style.display = "none");
      if (championsContainer) championsContainer.style.display = "none";
      if (myClanContainer) myClanContainer.style.display = "none";

      if (tab._page) {
        tab._page.style.display = "flex";
      } else if (tab.textContent.includes("CLAN WAR")) {
        if (championsContainer) championsContainer.style.display = "flex";
      } else if (tab.textContent.includes("MY CLAN")) {
        if (myClanContainer) myClanContainer.style.display = "flex";
      }
    });

    function addSorting(container) {
      const labels = container.querySelectorAll(".labels .label");
      const list = container.querySelector(".list");

      if (!labels.length || !list) return;

      const state = [0, 0];
      const icons = ["", ' <i class="fas fa-caret-up"></i>', ' <i class="fas fa-caret-down"></i>'];
      const baseText = ["scores per month", "scores"];

      function getItems() {
        return Array.from(list.querySelectorAll(".item"));
      }

      function getStatValue(item, colIndex) {
        const stats = item.querySelectorAll(".stat");
        if (!stats[colIndex]) return 0;
        return parseInt(stats[colIndex].textContent.replace(/\D/g, "")) || 0;
      }

      function applySort(colIndex) {
        const items = getItems();
        items.forEach((item, i) => {
          if (item.dataset.origIndex === undefined) item.dataset.origIndex = i;
        });

        const dir = state[colIndex];

        if (dir === 0) {
          items.sort((a, b) => parseInt(a.dataset.origIndex) - parseInt(b.dataset.origIndex));
        } else {
          items.sort((a, b) => {
            const diff = getStatValue(a, colIndex) - getStatValue(b, colIndex);
            return dir === 1 ? diff : -diff;
          });
        }

        items.forEach((item, i) => {
          item.querySelector(".number").textContent = dir === 0 ? parseInt(item.dataset.origIndex) + 1 : i + 1;
          list.appendChild(item);
        });
      }

      function updateLabels() {
        labels.forEach((label, i) => {
          label.innerHTML = baseText[i] + (icons[state[i]] || "");
        });
      }

      getItems().forEach((item, i) => item.dataset.origIndex = i);

      labels.forEach((label, colIndex) => {
        label.style.cursor = "pointer";
        label.style.userSelect = "none";

        label.addEventListener("click", () => {
          const other = colIndex === 0 ? 1 : 0;
          state[other] = 0;
          state[colIndex] = (state[colIndex] + 1) % 3;
          updateLabels();
          applySort(colIndex);
        });
      });
    }

    observeForElement(".clans .my-clan .list-container", (el) => {
      addSorting(el)

      let loading = null;
      let polling = null;

      const run = () => {
        clearTimeout(loading);
        clearTimeout(polling);

        loading = setTimeout(() => {
          const tryApply = () => {
            const clan = document.querySelector(".my-clan .clan-name");
            if (clan) {
              [
                ".my-clan .stat",
                ".my-clan .champions-values div",
                ".my-clan .all-scores-value"
              ].forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                  const raw = parseInt(el.textContent.replace(/\D/g, ""));
                  if (Number.isFinite(raw) && !isNaN(raw)) el.textContent = raw.toLocaleString();
                });
              });
              applyClanCustomizations();
            } else {
              polling = setTimeout(tryApply, 10);
            }
          };
          tryApply();
        }, 0);
      };
      run();
    });
  }

  const handleMarket = () => {
    const interval = setInterval(() => {
      if (!window.location.href === `${base_url}hub/market`) {
        clearInterval(interval);
        return;
      }
    }, 250);
  };

  const handleFriends = () => {
    const settings = ipcRenderer.sendSync("get-settings");
    const nicknames = JSON.parse(localStorage.getItem("nicknames") || "{}");

    if (window.copyGameLink) {
      document.removeEventListener("click", window.copyGameLink);
    }

    window.copyGameLink = (e) => {
      if (e.shiftKey && e.target.classList.contains("online")) {
        const online = e.target;
        if (online && online.innerText.includes("in game")) {
          const content = online.innerText.match(/\[(.*?)\]/)[1];
          const gameLink = `${base_url}games/${content}`;
          navigator.clipboard.writeText(gameLink);
          customNotification({
            message: `Copied game link to clipboard: ${gameLink}`,
          });
        }
      }
    };

    document.addEventListener("click", window.copyGameLink);

    const friendsCont = document.querySelector(".friends > .content > .allo");
    const addFriends = document.querySelector(".friends > .add-friends");
    const friendsList = friendsCont?.querySelector(".list");

    if (!friendsCont || !addFriends || !friendsList) return;

    function createSearch() {
      const searchFriends = document.createElement("div");
      searchFriends.className = "search-friends";
      searchFriends.style = `display: flex; flex-direction: column; align-items: flex-start; margin-top: 1.5rem; padding: 0 1rem;`;
      searchFriends.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; width: 100%;">
          <span class="search-text">Search</span>
          <span>Press Enter to search</span>
        </div>
        <input type="text" placeholder="ENTER USERNAME OR ID" class="search-input" style="border: .125rem solid #202639; outline: none; background: #2f3957; width: 100%; height: 2.875rem; padding-left: .5rem; box-sizing: border-box; font-weight: 600; font-size: 1rem; color: #f2f2f2; box-shadow: 0 1px 2px rgba(0,0,0,.4), inset 0 0 8px rgba(0,0,0,.4); border-radius: .25rem; transition: border-color 0.2s;"/>
        <span class="lookup-toggle" style="margin-top: 0.25rem; font-size: 0.75rem; color: rgba(255,255,255,0.4); cursor: pointer; user-select: none; transition: color 0.15s ease; text-decoration: underline;">Player Lookup</span>
      `;
      addFriends.appendChild(searchFriends);

      const input = searchFriends.querySelector(".search-input");
      const toggle = searchFriends.querySelector(".lookup-toggle");
      let lookupMode = false;

      const lookup = () => {
        const id = input.value.trim().replace(/^#/, "").toUpperCase();
        if (id.length === 6) {
          window.location.href = `https://kirka.io/profile/${id}`;
        } else {
          input.style.borderColor = "rgba(255, 0, 0, 0.4)";
          setTimeout(() => (input.style.borderColor = "rgba(76, 175, 138, 0.4)"), 1000);
        }
      };

      toggle.addEventListener("click", () => {
        lookupMode = !lookupMode;
        toggle.style.color = lookupMode ? "#4caf8a" : "rgba(255,255,255,0.4)";
        input.style.borderColor = lookupMode ? "rgba(76, 175, 138, 0.4)" : "#202639";
        input.placeholder = lookupMode ? "ENTER PLAYER ID..." : "ENTER USERNAME OR ID";

        if (lookupMode) {
          document.querySelectorAll(".friend").forEach((f) => (f.style.display = "flex"));
        } else {
          const query = input.value.toLowerCase();
          document.querySelectorAll(".friend").forEach((friend) => {
            const nickname = friend.querySelector(".nickname")?.innerText.toLowerCase() || "";
            const shortId = friend.querySelector(".friend-id")?.innerText.toLowerCase() || "";
            friend.style.display = nickname.includes(query) || shortId.includes(query) ? "flex" : "none";
          });
        }
      });

      input.addEventListener("keydown", (e) => {
        if (lookupMode && e.key === "Enter") lookup();
      });

      input.addEventListener("input", (e) => {
        if (lookupMode) return;
        const query = e.target.value.toLowerCase();
        document.querySelectorAll(".friend").forEach((friend) => {
          const nickname = friend.querySelector(".nickname")?.innerText.toLowerCase() || "";
          const shortId = friend.querySelector(".friend-id")?.innerText.toLowerCase() || "";
          friend.style.display = nickname.includes(query) || shortId.includes(query) ? "flex" : "none";
        });
      });
    }

    function addSpectateButton(div) {
      if (!settings.spectate_button) return;
      if (div.nextElementSibling?.classList.contains("spectate-eye")) return;

      const match = div.textContent.match(/\[(.*?)\]/);
      const code = match ? match[1] : null;
      if (!code) return;

      const eyeDiv = document.createElement("div");
      eyeDiv.className = "spectate-eye";
      eyeDiv.innerHTML = '<i class="fas fa-eye"></i>';
      div.insertAdjacentElement("afterend", eyeDiv);

      eyeDiv.addEventListener("click", (e) => {
        e.stopPropagation();

        document.querySelector(".home")?.click();
        document.querySelector(".join-btn")?.click();

        const observer = new MutationObserver(() => {
          const input = document.querySelector("#join-modal-modal .input");
          if (input) {
            input.value = code;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            document.querySelector(".btn:nth-child(2)")?.click();
            observer.disconnect();
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      });
    }

    const interval = setInterval(() => {
      if (!window.location.href.startsWith(`${base_url}friends`)) {
        clearInterval(interval);
        return;
      }

      document.querySelectorAll(".online").forEach((div) => {
        if (div.textContent.includes("in game"))
          addSpectateButton(div);
        else
          div.querySelector(".spectate-eye")?.remove();
      });

      if (!addFriends.querySelector(".search-friends")) createSearch();
    }, 250);

    const applyCustomizations = () => {
      if (settings.customizations) {
        const customizations = JSON.parse(
          localStorage.getItem("juice-customizations")
        );

        document.querySelectorAll(".friend").forEach((friend) => {
          const shortId = friend.querySelector(".friend-id").innerText;
          const customs = customizations?.find((c) => c.shortId === shortId);
          const nickname = friend.querySelector(".nickname");

          const entry = nicknames[shortId];

          if (entry?.nickname) {
            const textNode = [...nickname.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
            if (textNode) {
              if (!nickname.dataset.ingameName) {
                nickname.dataset.ingameName = textNode.textContent.trim();
              } else {
                const raw = textNode.textContent.trim();
                if (raw !== nickname.dataset.ingameName && raw !== entry.nickname) {
                  nickname.dataset.ingameName = raw;
                }
              }

              const currentIngameName = nickname.dataset.ingameName;

              if (entry.original && entry.original !== currentIngameName) {
                entry.original = currentIngameName;
                nicknames[shortId] = entry;
                localStorage.setItem("nicknames", JSON.stringify(nicknames));
              }
              textNode.textContent = entry.nickname;
            }
          }

          if (customs) {
            nickname.style = `
              display: flex !important;
              align-items: flex-end !important;
              gap: 0.25rem !important;
              overflow: unset !important;
            `;

            if (customs.gradient) {
              nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
              nickname.style.backgroundClip = "text";
              nickname.style.webkitBackgroundClip = "text";
              nickname.style.color = "transparent";
              nickname.style.fontWeight = "700";
              nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
              nickname.style.maxWidth = "min-width";
              nickname.style.overflow = "unset";
              if (settings.animations && customs.animated) {
                nickname.style.backgroundSize = "200% 200%";
                nickname.style.animation = "animated-gradient 3s linear infinite";
              }
            }

            let badgesElem = nickname.querySelector(".juice-badges");

            if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
              if (badgesElem) badgesElem.remove();

              badgesElem = document.createElement("div");
              badgesElem.style = "display: flex; gap: 0.25rem; align-items: center; width: 0;";
              badgesElem.className = "juice-badges";
              badgesElem.dataset.shortId = shortId;
              nickname.appendChild(badgesElem);
            } else if (badgesElem.dataset.shortId === shortId) return;

            const badgeStyle = "height: 18px; width: auto;";

            if (customs.discord) {
              const linkedBadge = document.createElement("img");
              linkedBadge.src = "https://juice.irrvlo.xyz/linked.png";
              linkedBadge.style.cssText = badgeStyle;
              badgesElem.appendChild(linkedBadge);
            }

            if (customs.booster) {
              const boosterBadge = document.createElement("img");
              boosterBadge.src = "https://juice.irrvlo.xyz/booster.png";
              boosterBadge.style.cssText = badgeStyle;
              badgesElem.appendChild(boosterBadge);
            }

            if (customs.badges?.length) {
              customs.badges.forEach((badge) => {
                const img = document.createElement("img");
                if (badge.startsWith("/") || badge.match(/^[A-Za-z]:\\/)) {
                  const filePath = badge.replace(/\\/g, "/");
                  img.src = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
                } else {
                  img.src = badge;
                }
                img.style.cssText = badgeStyle;
                badgesElem.appendChild(img);
              });
            }
          }
        });
      }
    };
    applyCustomizations();

    document.querySelectorAll(".friends .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        applyCustomizations();
      });
    });
  };

  const handleInventory = () => {
    const STORAGE_KEY = "inventory_favorites";

    function getFavorites() {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    }

    function saveFavorite(id, isFavorite) {
      const favorites = getFavorites();
      if (isFavorite) {
        if (!favorites.includes(id)) favorites.push(id);
      } else {
        const index = favorites.indexOf(id);
        if (index > -1) favorites.splice(index, 1);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }

    function sortInventory() {
      const container = document.querySelector(".inventory .subjects");
      if (!container) return;
      const items = [...container.children];
      items.sort((a, b) => b.classList.contains("favorite") - a.classList.contains("favorite"));
      items.forEach(item => container.appendChild(item));
    }

    function applyFavorites() {
      const favorites = getFavorites();
      document.querySelectorAll(".inventory .subject").forEach((subject) => {
        const id = subject.textContent.trim();;
        if (favorites.includes(id)) {
          subject.classList.add("favorite");

          subject.addEventListener("click", (e) => {
            if (!ipcRenderer.sendSync("get-settings").prevent_selling_favorites) return;
            const sellBtn = e.target.closest(".sell-btn");
            if (sellBtn) {
              e.stopImmediatePropagation();
              return false;
            }
          }, true);
        }
      });
    }

    function addFavoriteButtons() {
      document.querySelectorAll(".inventory .subject").forEach((subject) => {
        if (subject.querySelector(".favorite-btn")) return;
        const toggleFavorite = document.createElement("div");
        toggleFavorite.classList.add("favorite-btn");
        toggleFavorite.innerHTML = '<i class="fas fa-star"></i>';

        toggleFavorite.addEventListener("click", () => {
          subject.classList.toggle("favorite");
          const isFavorite = subject.classList.contains("favorite");
          saveFavorite(subject.textContent.trim(), isFavorite);
          sortInventory();
        });

        toggleFavorite.addEventListener("mouseenter", (e) => {
          subject.querySelectorAll(".bottom-inv").forEach(button => button.style.visibility = "hidden");
          subject.querySelector(".hover-bg").style.visibility = "hidden";
        })
        toggleFavorite.addEventListener("mouseleave", () => {
          subject.querySelectorAll(".bottom-inv").forEach(button => button.style.visibility = "visible");
          subject.querySelector(".hover-bg").style.visibility = "visible";
        })

        subject.appendChild(toggleFavorite);
      });
    }

    document.querySelectorAll(".inventory .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        applyFavorites();
        addFavoriteButtons();
        sortInventory();
      });
    });

    let observer;

    observeForElement(".inventory .gun", () => {
      applyFavorites();
      addFavoriteButtons();
      sortInventory();

      const container = document.querySelector(".inventory .subjects");

      observer = new MutationObserver(() => {
        observer.disconnect();
        applyFavorites();
        addFavoriteButtons();
        sortInventory();
        observer.observe(container, { childList: true, subtree: false });
      });

      observer.observe(container, { childList: true, subtree: false });
    });
  };

  window.customNotification = (data) => {
    const notifElement = document.createElement("div");
    notifElement.classList.add("vue-notification-wrapper");
    notifElement.style =
      "transition-timing-function: ease; transition-delay: 0s; transition-property: all;";
    notifElement.innerHTML = `
    <div
      style="
        display: flex;
        align-items: center;
        padding: .9rem 1.1rem;
        margin-bottom: .5rem;
        color: var(--white);
        cursor: pointer;
        box-shadow: 0 0 0.7rem rgba(0,0,0,.25);
        border-radius: .2rem;
        background: linear-gradient(262.54deg,#202639 9.46%,#223163 100.16%);
        margin-left: 1rem;
        border: solid .15rem #ffb914;
        font-family: Exo\ 2;" class="alert-default"
    > ${data.icon
        ? `
        <img
          src="${data.icon}"
          style="
            min-width: 2rem;
            height: 2rem;
            margin-right: .9rem;"
        />`
        : ""
      }
      <span style="font-size: 1rem; font-weight: 600; text-align: left;" class="text">${data.message
      }</span>
    </div>`;

    document
      .getElementsByClassName("vue-notification-group")[0]
      .children[0].appendChild(notifElement);

    setTimeout(() => {
      try {
        notifElement.remove();
      } catch { }
    }, 5000);
  };

  ipcRenderer.on("notification", (_, data) => customNotification(data));

  document.addEventListener("juice-settings-changed", ({ detail }) => {
    const { setting, value } = detail;

    const directSettings = [
      "weapon_offset_x", "weapon_offset_y", "weapon_offset_z",
      "weapon_size", "weapon_wireframe", "weapon_rgb", "weapon_color",
      "include_arms", "customizations",
      "local_customizations", "map_backgrounds"
    ];

    if (directSettings.includes(setting)) {
      settings[setting] = value;
    }

    switch (setting) {
      case "menu_keybind":
        const keybindReminder = document.querySelector("#juice-keybind-reminder");
        if (keybindReminder)
          keybindReminder.innerText = `Press ${value} to open the client menu.`;
        break;

      case "css_link":
      case "css_enabled":
      case "advanced_css":
        window.updateTheme();
        break;

      case "customizations":
        value ? window.applyUserCustomizations() : window.removeUserCustomizations();
        break;

      case "clancustomizations":
        value ? window.applyClanCustomizations() : window.removeClanCustomizations();
        break;

      case "animations":
        if (value) {
          window.applyUserCustomizations();
          window.applyClanCustomizations();
        } else {
          window.removeGradientAnimations();
        }
        break;

      case "inspect_duration":
        INSPECT_DURATION = value;
        break;

      case "ads_power":
        settings.ads_power = value;
        setAdsPower(value);
        break;
    }
  });

  ipcRenderer.on("url-change", (_, url) => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.trace = originalConsole.trace;

    const previousUrl = window._currentUrl;
    window._currentUrl = url;

    if (url === `${base_url}`) {
      handleLobby();
      handleInGame();
    }
    if (url.startsWith(`${base_url}games`)) handleInGame();
    if (url.startsWith(`${base_url}hub/ranked`)) handleInGame();
    if (url.startsWith(`${base_url}servers/`)) handleServers();
    if (url.startsWith(`${base_url}profile/`)) handleProfile();
    if (url === `${base_url}hub/clans/champions-league`) handleClans();
    if (url === `${base_url}hub/market`) handleMarket();
    if (url === `${base_url}friends`) handleFriends();
    if (url === `${base_url}inventory`) handleInventory();

    window.dispatchEvent(new CustomEvent("url-changed", { detail: url }));
  });

  const handleInitialLoad = () => {
    const url = window.location.href;
    if (url === `${base_url}`) {
      handleLobby();
      handleInGame();
    }
    if (url.startsWith(`${base_url}games`)) handleInGame();
    if (url.startsWith(`${base_url}hub/ranked`)) handleInGame();
    if (url.startsWith(`${base_url}servers/`)) handleServers();
    if (url.startsWith(`${base_url}profile/`)) handleProfile();
    if (url === `${base_url}hub/clans/champions-league`) handleClans();
    if (url === `${base_url}hub/market`) handleMarket();
    if (url === `${base_url}friends`) handleFriends();
    if (url === `${base_url}inventory`) handleInventory();

    loadTheme();
    applyUIFeatures();
  };

  handleInitialLoad();
});