const Menu = require("./menu");
const { opener } = require("../addons/opener");
const { editResourceSwapper } = require("../addons/swappermenu");
const { customReqScripts } = require("../addons/customReqScripts");
const { ipcRenderer, clipboard } = require("electron");
const { initGallery } = require("../addons/gallery");
const fs = require("fs");
const path = require("path");

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
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
            functionToRun(node);
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

document.addEventListener("DOMContentLoaded", async () => {
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
      fetch(
        "https://raw.githubusercontent.com/zVipexx/dawn-client/refs/heads/main/weapons.json"
      ).then((r) => r.json()),
    ])

    localStorage.setItem("juice-customizations", JSON.stringify(customizations))
    localStorage.setItem("juice-clans", JSON.stringify(clan))
    localStorage.setItem("weapons", JSON.stringify(weapons))
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
    document.addEventListener("juice-settings-changed", ({ detail }) => {
      if (detail.setting === "menu_keybind") {
        const keybindReminder = document.querySelector(
          "#juice-keybind-reminder"
        );
        if (keybindReminder)
          keybindReminder.innerText = `Press ${detail.value} to open the client menu.`;
      }
    });
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
    let presets = JSON.parse(localStorage.getItem("dawn-room-presets") || "[]");

    const savePresets = () => {
      localStorage.setItem("dawn-room-presets", JSON.stringify(presets));
    };

    const scrapeSettings = (modal) => {
      const settings = { selects: {}, checkboxes: {}, inputs: {} };

      modal.querySelectorAll(".element").forEach(el => {
        const labelEl = el.querySelector(".label");
        if (!labelEl) return;
        const label = labelEl.textContent.trim().split(" ")[0].split("\n")[0];
        const selected = el.querySelector(".right .selected")?.textContent.trim();
        if (label && selected) settings.selects[label] = selected;
      });

      modal.querySelectorAll(".custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const input = cb.querySelector("input");
        if (label && input) settings.checkboxes[label] = input.checked;
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

            await new Promise(resolve => setTimeout(resolve, 150));

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

            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      modal.querySelectorAll(".custom-checkbox").forEach(cb => {
        const label = cb.querySelector("span")?.textContent.trim();
        const targetState = preset.settings.checkboxes[label];
        const input = cb.querySelector("input");
        if (label && targetState !== undefined && input.checked !== targetState) {
          input.click();
        }
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

      presets.forEach((preset, index) => {
        const item = document.createElement("div");
        item.className = "room-preset-item";
        item.innerHTML = `
          <input class="room-preset-name-input" type="text" value="${preset.name}" />
          <div class="room-preset-actions">
            <i class="fas fa-play room-preset-action apply" title="Apply"></i>
            <i class="fas fa-trash room-preset-action delete" title="Delete"></i>
          </div>
        `;

        const nameInput = item.querySelector(".room-preset-name-input");

        nameInput.onchange = () => {
          preset.name = nameInput.value.trim() || preset.name;
          nameInput.value = preset.name;
          savePresets();
        };

        nameInput.onclick = (e) => e.stopPropagation();

        item.querySelector(".apply").onclick = async (e) => {
          e.stopPropagation();
          const icon = item.querySelector(".apply");
          if (item.dataset.loading === "true") return;
          item.dataset.loading = "true";

          icon.className = "fas fa-spinner fa-spin room-preset-action";
          await applyPreset(modal, preset);
          icon.className = "fas fa-check room-preset-action";

          setTimeout(() => {
            icon.className = "fas fa-play room-preset-action apply";
            delete item.dataset.loading;
          }, 1000);
        };

        item.ondblclick = async (e) => {
          if (e.target.closest(".room-preset-action")) return;
          if (e.target.closest(".room-preset-name-input")) return;

          const icon = item.querySelector(".apply");
          if (item.dataset.loading === "true") return;
          item.dataset.loading = "true";

          icon.className = "fas fa-spinner fa-spin room-preset-action";
          await applyPreset(modal, preset);
          icon.className = "fas fa-check room-preset-action";
          
          setTimeout(() => {
            icon.className = "fas fa-play room-preset-action apply";
            delete item.dataset.loading;
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
          <div class="room-presets-title">PRESETS</div>
        </div>
        <div class="room-presets-list"></div>
        <div class="juice-button save-preset">
          <i class="fas fa-plus"></i> SAVE CURRENT
        </div>
      `;

      sidebar.querySelector(".save-preset").onclick = () => {
        const modal = container.querySelector(".vm--modal");
        const settings = scrapeSettings(modal);
        presets.push({ name: `Preset ${presets.length + 1}`, settings });
        savePresets();
        renderPresets(sidebar, modal);

        const btn = sidebar.querySelector(".save-preset");
        btn.innerHTML = `<i class="fas fa-check"></i> SAVED!`;
        btn.style.background = "transparent";
        btn.style.color = "#fff";
        btn.style.pointerEvents = "none";

        setTimeout(() => {
          btn.innerHTML = `<i class="fas fa-plus"></i> SAVE CURRENT`;
          btn.style.background = "";
          btn.style.color = "";
          btn.style.pointerEvents = "";
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
            }, 100);
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

  const loadTheme = () => {
    const addedStyles = document.createElement("style");
    addedStyles.id = "juice-styles-theme";
    document.head.appendChild(addedStyles);

    const customStyles = document.createElement("style");
    customStyles.id = "juice-styles-custom";
    document.head.appendChild(customStyles);

    const updateTheme = () => {
      const settings = ipcRenderer.sendSync("get-settings");
      const cssLink = settings.css_link;
      const advancedCSS = settings.advanced_css;

      if (cssLink && settings.css_enabled) {
        addedStyles.innerHTML = `@import url('${formatLink(cssLink)}');`;
      } else {
        addedStyles.innerHTML = "";
      }

      customStyles.innerHTML = advancedCSS;
    };

    document.addEventListener("juice-settings-changed", (e) => {
      if (
        e.detail.setting === "css_link" ||
        e.detail.setting === "css_enabled" ||
        e.detail.setting === "advanced_css"
      ) {
        updateTheme();
      }
    });

    updateTheme();
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
          ".tab-info, .tab-team-info { display: flex !important; border-radius: 0.5rem !important; max-width: 30rem !important; top: 0 !important; right: 0 !important; position: absolute; margin: 0.5rem !important; padding: 0.15rem !important; width: 35rem !important; }",
          ".tab-team-info .players-cont { flex-direction: column !important; }",
          ".tab-info .player-list, .tab-team-info .player-list { margin: unset !important; gap: 0.25rem; }",
          ".tab-info > .head, .tab-team-info > .head { display: none; }",
          '.tab-team-info .player-list:nth-child(1)::before { content: "RED"; width: 100%; text-align: left; padding: 0.25rem 0.5rem; font-size: 1.25rem; background-color: #ff4d42; border-radius: 0.25rem; box-sizing: border-box; }',
          '.tab-team-info .player-list:nth-child(2)::before { content: "BLUE"; width: 100%; text-align: left; padding: 0.25rem 0.5rem; font-size: 1.25rem; background-color: #0d6dc6; border-radius: 0.25rem; box-sizing: border-box; margin-top: 0.5rem; }',
          ".players-wrap .list { display: none !important; }",
          ".tab-info .list, .tab-team-info .player-list > .list { order: 999; }",
          ".tab-info .players-wrap, .tab-team-info .players-wrap { padding: 0.25rem; }",
          ".tab-info .player-cont, .tab-team-info .player-cont { margin: unset; }",
          ".kill-bar-cont { right: 37.5rem !important; }",
          ".tab-info { background: #141414a3 !important; border-radius: 0.25rem !important; max-width: 35rem !important; }",
          ".tab-info .head { background: linear-gradient(90deg, #ff932d, transparent) !important; border: unset; font-style: normal; border-top-left-radius: 0.25rem; }",
          ".tab-info .head .server-id { display: none; }",
          ".tab-info .list-value { color: #acfa70; }",
          ".tab-team-info { background: #141414a3 !important; border-radius: 0.25rem !important; max-width: 60rem !important; }",
          ".tab-team-info .head { background: transparent !important; }",
          ".tab-team-info .label.red { border-top-left-radius: 0.25rem; background: linear-gradient(90deg, #ff4c4c, #141414a3); justify-content: flex-start; padding-left: 0.75rem; }",
          ".tab-team-info .label.blue { border-top-right-radius: 0.25rem; background: linear-gradient(-90deg, #4476ff, #141414a3); justify-content: flex-end; padding-right: 0.75rem; }",
          ".player-list .list-value { color: #acfa70; }",
          ".player-list .player-cont { background: #141414a3 !important; border-radius: 0.25rem; padding: 0.25rem; }",
          ".player-cont .nickname.bolder { color: #edb846; }"
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
      ];
      if (relevantSettings.includes(e.detail.setting)) updateUIFeatures();
    });
    updateUIFeatures();
  };

  const handleLobby = () => {
    initRoomPresets();
    const applyLobbyChanges = () => {
      const settings = ipcRenderer.sendSync("get-settings");

      lobbyKeybindReminder(settings);
      lobbyNews(settings);
      juiceDiscordButton();

      const customizations = JSON.parse(
        localStorage.getItem("juice-customizations")
      );

      shortIdCard = document.querySelector(".avatar-info .username").textContent.trim().split("#")[1];

      const applyCustomizations = () => {
        if (customizations?.find((c) => c.shortId === shortIdCard)) {
          const customs = customizations.find(
            (c) => c.shortId === shortIdCard
          );

          const lobbyNickname = document.querySelector(
            ".team-section .heads .nickname"
          );

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

            if (settings.animations && customs.animated) {
              lobbyNickname.style.backgroundSize = "200% 200%";
              lobbyNickname.style.animation = "animated-gradient 3s linear infinite";
            }
          }
          else
            lobbyNickname.style =
              "display: flex; align-items: flex-end; gap: 0.25rem; overflow: unset !important;";

          if (lobbyNickname.querySelector(".juice-badges")) return;

          const badgesElem = document.createElement("div");
          badgesElem.style =
            "display: flex; gap: 0.25rem; align-items: center; width: 0;";
          badgesElem.className = "juice-badges";

          lobbyNickname.appendChild(badgesElem);

          let badgeStyle = "height: 32px; width: auto;";

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

              if (badge.startsWith('/') || badge.match(/^[A-Za-z]:\\/)) {
                const filePath = badge.replace(/\\/g, '/');
                img.src = `file://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
              } else {
                img.src = badge;
              }

              img.style = badgeStyle;
              badgesElem.appendChild(img);
            });
          }
        };

        const clan = document.querySelector(".team-section .heads .clan-tag");

        const clancustomizations = JSON.parse(
          localStorage.getItem("juice-clans")
        );

        const userClan = clan.textContent.trim();

        if (clancustomizations.find((c) => c.clan === userClan) && settings.clancustomizations) {
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
      };

      const removeCustomizations = () => {
        const lobbyNickname = document.querySelector(
          ".team-section .heads .nickname"
        );
        lobbyNickname.style =
          "display: flex; align-items: flex-end; gap: 0.25rem;";
        lobbyNickname.querySelector(".juice-badges")?.remove();
      };

      if (settings.customizations) applyCustomizations();

      document.addEventListener("juice-settings-changed", ({ detail }) => {
        if (detail.setting === "customizations")
          detail.value ? applyCustomizations() : removeCustomizations();
      });

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

    observeForElement(".quests", () => {
      setTimeout(() => applyLobbyChanges(), 500);
    });
  };

  const handleServers = async () => {
    const settings = ipcRenderer.sendSync("get-settings");

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
                message: `'${username}${text}' copied to clipboard!`,
              });
              clipboard.writeText(username + text);
            });
          }, 250);
        }
      });
    }

    const createTradeButtons = () => {
      const chatLabel = document.querySelector(".servers .chat-label");
      if (!chatLabel) return;
      if (chatLabel.parentElement.querySelector(".trade-buttons")) return;

      const container = document.createElement("div");
      container.className = "trade-buttons";
      container.style = "display: flex; gap: 0.5rem; margin-left: 1rem;";

      const makeDivButton = (label, bg, borderTop, borderBottom) => {
        const head = document.querySelector(".servers .chat-head");
        head.style.position = "relative";
        head.style.zIndex = "1";

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

      const input = document.querySelector(".servers .chat .input");
      const sendBtn = document.querySelector(".servers .chat .enter");

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

      const input = document.querySelector(".servers .chat .input");
      const sendBtn = document.querySelector(".servers .chat .enter");
      if (!input || !sendBtn) return;

      input.value = `/trade accept ${tradeId}`;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      sendBtn.click();
    }
  };

  let disconnectObservers = () => {};

  const handleProfile = () => {
    disconnectObservers();

    const settings = ipcRenderer.sendSync("get-settings");

    const applyCardChanges = () => {
      const profile = document.querySelector(".tab-content > .profile-cont > .profile");
      if (!profile) return;

      const statistics = profile.querySelectorAll(".statistic");
      const progressExp = profile.querySelector(".progress-exp");

      const formatRate = (val) => {
        const fixed = val.toFixed(2);
        return (parseFloat(fixed) % 1 === 0 ? Math.round(val) : parseFloat(fixed)) + "%";
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
        const num = Number(rawText.replace(/[^\d]/g, ""));
        if (!Number.isFinite(num)) return;

        statMap[name] = { stat, valueElem, num };
        valueElem.innerText = num.toLocaleString();
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
      const userClan = profile.querySelector(".clan-tag")?.textContent.trim();
      const content = profile.querySelector(".profile > .content");

      if (settings.customizations && userClan) {
        const shortId = profile.querySelector(".card-profile .copy-cont .value").textContent.trim().split("#")[1];
        const nickname = profile.querySelector(".nickname");
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
          badgesElem.style =
            "display: flex; gap: 0.25rem; align-items: center;";
          badgesElem.className = "juice-badges";
          nickname.appendChild(badgesElem);
        } else {
          badgesElem.innterHTML = "";
        }

        const customizations = JSON.parse(
          localStorage.getItem("juice-customizations")
        );

        const clancustomizations = JSON.parse(
          localStorage.getItem("juice-clans")
        );

        if (customizations?.find((c) => c.shortId === shortId)) {
          const customs = customizations.find((c) => c.shortId === shortId);

          let badgeStyle = "height: 32px; width: auto;";

          const span = nickname.querySelector(".nickname-span");

          if (customs.gradient) {
            span.style.display = "inline-block";
            span.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
            span.style.backgroundClip = "text";
            span.style.webkitBackgroundClip = "text";
            span.style.color = "transparent";
            span.style.fontWeight = "700";
            span.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";

            if (settings.animations && customs.animated) {
              span.style.backgroundSize = "200% 200%";
              span.style.animation = "animated-gradient 3s linear infinite";
            }
          }

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

              if (badge.startsWith('/') || badge.match(/^[A-Za-z]:\\/)) {
                const filePath = badge.replace(/\\/g, '/');
                img.src = `file://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
              } else {
                img.src = badge;
              }

              img.style = badgeStyle;
              badgesElem.appendChild(img);
            });
          }
        }

        if (clancustomizations.find((c) => c.clan === userClan) && settings.clancustomizations) {
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

    let loading = null;
    let polling = null;

    const run = () => {
      clearTimeout(loading);
      clearTimeout(polling);

      loading = setTimeout(() => {
        const tryApply = () => {
          const profile = document.querySelector(".tab-content .statistics");
          if (profile) {
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
    let red_players = [];
    let blue_players = [];

    const updatePlayerLists = () => {
      red_players = [];
      blue_players = [];

      const red_players_cont = document.querySelectorAll(".desktop-game-interface .player-left-cont .player-cont");
      const blue_players_cont = document.querySelectorAll(".desktop-game-interface .player-right-cont .player-cont");

      red_players_cont.forEach((player) => {
        const nickname = player.querySelector(".nickname")?.innerText;
        if (nickname) red_players.push(nickname.trim());
      });

      blue_players_cont.forEach((player) => {
        const nickname = player.querySelector(".nickname")?.innerText;
        if (nickname) blue_players.push(nickname.trim());
      });
    };

    const colorKillFeed = () => {
      if (!settings.colored_killfeed) return;
      const killBarItem = document.querySelectorAll(".desktop-game-interface .kill-bar-cont .kill-bar-item");
      killBarItem.forEach((item) => {
        const killer = item.firstChild;
        if (!killer || !killer.innerText) return;

        const killerName = killer.innerText.trim();
        if (red_players.includes(killerName)) {
          item.classList.add("red");
          item.classList.remove("blue");
        } else if (blue_players.includes(killerName)) {
          item.classList.add("blue");
          item.classList.remove("red");
        }
      });
    };

    const updateKD = () => {
      const kills = document.querySelector(".kill-death .kill");
      const deaths = document.querySelector(
        "div > svg.icon-death"
      )?.parentElement;
      const kd = document.querySelector(".kill-death .kd");

      if (!kills || !deaths || !kd) return;

      const killCount = parseFloat(kills.innerText);
      const deathCount = parseFloat(deaths.innerText) || 1;
      let kdRatio = (killCount / deathCount).toFixed(2);

      kd.innerHTML = `<span class="kd-ratio">${kdRatio}</span> <span class="text-kd" style="font-size: 0.75rem;">K/D</span>`;
    };

    const createKD = () => {
      if (document.querySelector(".kill-death .kd")) return;
      const kills = document.querySelector(".kill-death .kill");
      const deaths = document.querySelector(
        "div > svg.icon-death"
      )?.parentElement;
      const kd = kills?.cloneNode(true);

      if (!kd) return;
      kd.classList.add("kd");
      kd.classList.remove("kill");
      kd.style.display = "flex";
      kd.style.alignItems = "center";
      kd.style.gap = "0.25rem";
      kd.innerHTML = `<span class="kd-ratio">0</span> <span class="text-kd" style="font-size: 0.75rem;">K/D</span>`;

      document.querySelector(".kill-death").appendChild(kd);
      kills.addEventListener("DOMSubtreeModified", updateKD);
      deaths.addEventListener("DOMSubtreeModified", updateKD);
    };

    document.addEventListener("juice-settings-changed", ({ detail }) => {
      if (detail.setting === "kd_indicator")
        settings.kd_indicator = detail.value;
      else if (detail.setting === "customizations")
        settings.customizations = detail.value;
    });

    const customizations = JSON.parse(
      localStorage.getItem("juice-customizations")
    );

    const clancustomizations = JSON.parse(
      localStorage.getItem("juice-clans")
    );

    if (!document.querySelector(".desktop-game-interface")) {
      return;
    }

    const applyCustomizationsTab = () => {
      const tabplayers = document.querySelectorAll(
        ".desktop-game-interface .player-cont"
      );

      if (settings.customizations) {
        tabplayers.forEach((player) => {
          const playerLeft = player.querySelector(".player-left");
          const nickname = player.querySelector(".nickname");
          const shortId = player
            .querySelector(".short-id")
            ?.innerText.replace("#", "");

          if (!shortId) {
            player.querySelector(".juice-badges")?.remove();
            nickname.style = "";
            playerLeft.style = "";
            return;
          }

          const customs = customizations?.find((c) => c.shortId === shortId);

          if (customs) {
            let badgesElem = player.querySelector(".juice-badges");

            if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
              badgesElem?.remove();
              badgesElem = document.createElement("div");
              badgesElem.style =
                "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
              badgesElem.className = "juice-badges";
              badgesElem.dataset.shortId = shortId;

              nickname.style = "overflow: unset;";
              playerLeft.style = "width: 0;";
              playerLeft.insertBefore(badgesElem, playerLeft.lastChild);
            } else {
              badgesElem.innerHTML = "";
            }

            const badgeStyle = "height: 22px; width: auto;";

            if (customs.gradient) {
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

                if (src.startsWith('/') || src.match(/^[A-Za-z]:\\/)) {
                  const filePath = src.replace(/\\/g, '/');
                  img.src = `file://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
                } else {
                  img.src = src;
                }

                img.style.cssText = badgeStyle;
                badgesElem.appendChild(img);
              }
            };

            if (customs.discord)
              addBadge("https://juice.irrvlo.xyz/linked.png");
            if (customs.booster)
              addBadge("https://juice.irrvlo.xyz/booster.png");

            if (customs.badges?.length) {
              customs.badges.forEach((badge) => addBadge(badge));
            }
          } else {
            playerLeft.querySelector(".juice-badges")?.remove();
            nickname.style = "";
            playerLeft.style = "";
          }
        });
      } else {
        tabplayers.forEach((player) => {
          player.querySelector(".juice-badges")?.remove();
          player.querySelector(".nickname").style = "";
          player.querySelector(".player-left").style = "";
        });
      }
    };

    const applyCustomizationsEsc = () => {
      const escplayers = document.querySelectorAll(
        ".esc-interface .player-cont"
      );

      if (settings.customizations) {
        escplayers.forEach((player) => {
          const playerLeft = player.querySelector(".player-left");
          const playerIds = player.querySelector(".player-name");
          const nickname = playerIds.querySelector(".nickname");
          const shortId = nickname.querySelector(".short-id")?.innerText.replace("#", "");
          const shortIdElem = nickname.querySelector(".short-id");

          if (!shortId) {
            player.querySelector(".juice-badges")?.remove();
            nickname.style = "";
            playerLeft.style = "";
            return;
          }

          const customs = customizations?.find((c) => c.shortId === shortId);

          if (customs) {
            let badgesElem = player.querySelector(".juice-badges");

            if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
              badgesElem?.remove();
              badgesElem = document.createElement("div");
              badgesElem.style =
                "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
              badgesElem.className = "juice-badges";
              badgesElem.dataset.shortId = shortId;

              nickname.style = "overflow: unset;";
              playerLeft.style = "width: 0;";
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

              shortIdElem.style.background = "none";
              shortIdElem.style.webkitBackgroundClip = "unset";
              shortIdElem.style.backgroundClip = "unset";
              shortIdElem.style.color = "";
              shortIdElem.style.textShadow = "none";

              if (settings.animations && customs.animated) {
                nickname.style.backgroundSize = "200% 200%";
                nickname.style.animation = "animated-gradient 3s linear infinite";
              }
            }

            const addBadge = (src) => {
              if (![...badgesElem.children].some((img) => img.src === src)) {
                const img = document.createElement("img");

                if (src.startsWith('/') || src.match(/^[A-Za-z]:\\/)) {
                  const filePath = src.replace(/\\/g, '/');
                  img.src = `file://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
                } else {
                  img.src = src;
                }

                img.style.cssText = badgeStyle;
                badgesElem.appendChild(img);
              }
            };

            if (customs.discord)
              addBadge("https://juice.irrvlo.xyz/linked.png");
            if (customs.booster)
              addBadge("https://juice.irrvlo.xyz/booster.png");

            if (customs.badges?.length) {
              customs.badges.forEach((badge) => addBadge(badge));
            }
          } else {
            playerLeft.querySelector(".juice-badges")?.remove();
            nickname.style = "";
            playerLeft.style = "";
          }
        });
      } else {
        escplayers.forEach((player) => {
          player.querySelector(".juice-badges")?.remove();
          player.querySelector(".nickname").style = "";
          player.querySelector(".player-left").style = "";
        });
      }

      if (settings.clancustomizations) {
        escplayers.forEach((player) => {
          const playerIds = player.querySelector(".player-name");
          const clanElem = playerIds.querySelector(".label");
          const clan = clanElem ? clanElem.textContent.trim() : null;

          if (!clanElem) {
            clanElem.style = "";
            return;
          }

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
          player.querySelector(".label").style = "color: var(--WwwmMnW-2);";
        });
      }
    };

    if (!document.querySelector(".kill-death .kd") && settings.kd_indicator) {
      createKD();
    } else if (
      document.querySelector(".kill-death .kd") &&
      !settings.kd_indicator
    ) {
      document.querySelector(".kill-death .kd").remove();
    }

    const observeShortIds = () => {
      const tabPlayers = document.querySelectorAll(".desktop-game-interface .player-cont");

      tabPlayers.forEach(player => {
        const shortIdElem = player.querySelector(".short-id");
        if (!shortIdElem || shortIdElem.dataset.observerAttached) return;

        shortIdElem.dataset.observerAttached = "true";

        new MutationObserver(() => {
          applyCustomizationsTab();
        }).observe(shortIdElem, {
          characterData: true,
          subtree: true,
          childList: true
        });
      });
    };

    observeShortIds();
    applyCustomizationsEsc();

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
    })

    const warmupTimer = document.querySelector(".warmup-timer");
    if (!warmupTimer) {
      updatePlayerLists();
      const killBarCont = document.querySelector(".kill-bar-cont");
      const killBarObserver = new MutationObserver(() => {
        if (settings.colored_killfeed) colorKillFeed();
      });
      killBarObserver.observe(killBarCont, { childList: true });
      return;
    } else {
      const warmupInterval = setInterval(() => {
        if (!document.querySelector(".warmup-timer")) {
          clearInterval(warmupInterval);
          red_players = [];
          blue_players = [];
          updatePlayerLists();
          applyCustomizationsTab();
          const killBarCont = document.querySelector(".kill-bar-cont");
          const killBarObserver = new MutationObserver(() => {
            if (settings.colored_killfeed) colorKillFeed();
          });
          killBarObserver.observe(killBarCont, { childList: true });
        }
      }, 1000);
    }

    observeForElement(".esc-interface", () => {
      applyCustomizationsEsc();
    });
  };

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

    document.addEventListener("click", (e) => {
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
    });

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
        <input type="text" placeholder="ENTER USERNAME OR ID" class="search-input" style="border: .125rem solid #202639; outline: none; background: #2f3957; width: 100%; height: 2.875rem; padding-left: .5rem; box-sizing: border-box; font-weight: 600; font-size: 1rem; color: #f2f2f2; box-shadow: 0 1px 2px rgba(0,0,0,.4), inset 0 0 8px rgba(0,0,0,.4); border-radius: .25rem;"/>`;
      addFriends.appendChild(searchFriends);

      searchFriends
        .querySelector(".search-input")
        .addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          document.querySelectorAll(".friend").forEach((friend) => {
            const nickname =
              friend.querySelector(".nickname")?.innerText.toLowerCase() || "";
            const shortId =
              friend.querySelector(".friend-id")?.innerText.toLowerCase() || "";
            friend.style.display =
              nickname.includes(query) || shortId.includes(query)
                ? "flex"
                : "none";
          });
        });
    }

    function addSpectateButton(div) {
      if (div.nextElementSibling?.classList.contains("spectate-eye")) return;

      const match = div.textContent.match(/\[(.*?)\]/);
      const code = match ? match[1] : null;
      if (!code) return;

      const eyeDiv = document.createElement("div");
      eyeDiv.className = "spectate-eye";
      eyeDiv.innerHTML = '<i class="fa-solid fa-eye"></i>';
      div.insertAdjacentElement("afterend", eyeDiv);

      eyeDiv.addEventListener("click", (e) => {
        e.stopPropagation();

        document.querySelector(".home")?.click();
        document.querySelector(".join-btn")?.click();

        const observer = new MutationObserver(() => {
          const input = document.querySelector(".input");
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
        if (div.textContent.trim().toLowerCase().includes("in game"))
          addSpectateButton(div);
      });

      if (!addFriends.querySelector(".search-friends")) createSearch();
    }, 250);

    if (settings.customizations) {
      const customizations = JSON.parse(
        localStorage.getItem("juice-customizations")
      );

      document.querySelectorAll(".friend").forEach((friend) => {
        const shortId = friend.querySelector(".friend-id").innerText;
        const customs = customizations?.find((c) => c.shortId === shortId);

        if (customs) {
          const nickname = friend.querySelector(".nickname");
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

  const customNotification = (data) => {
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

  ipcRenderer.on("url-change", (_, url) => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.trace = originalConsole.trace;

    if (url === `${base_url}`) {
      handleLobby();
      handleInGame();
    }
    if (url.startsWith(`${base_url}games`)) handleInGame();
    if (url.startsWith(`${base_url}hub/ranked`)) handleInGame();
    if (url.startsWith(`${base_url}servers/`)) handleServers();
    if (url.startsWith(`${base_url}profile/`)) handleProfile();
    if (url === `${base_url}hub/market`) handleMarket();
    if (url === `${base_url}hub/clans`) handleClans();
    if (url === `${base_url}friends`) handleFriends();
    if (url === `${base_url}inventory`) handleInventory();
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
    if (url === `${base_url}hub/market`) handleMarket();
    if (url === `${base_url}hub/clans`) handleClans();
    if (url === `${base_url}friends`) handleFriends();
    if (url === `${base_url}inventory`) handleInventory();

    loadTheme();
    applyUIFeatures();
  };

  handleInitialLoad();
})();