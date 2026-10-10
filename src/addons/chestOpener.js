const openerListUrl = "https://raw.githubusercontent.com/zVipexx/dawn-client/refs/heads/main/openerlist.json";
const translationsUrl = "https://raw.githubusercontent.com/Cheeseybowrger/KirkaScripts/refs/heads/main/ConsoleScripts/microwaves.json";
const sellUrl = "https://api2.kirka.io/api/wmnwWNMW/wwMmnN";
const maxSellFails = 3;
const delayMs = 1300;
const rateLimitPauseMs = 5000;

const rarityColors = {
  PARANORMAL: "a855f7",
  MYTHICAL: "c20025",
  LEGENDARY: "feaa37",
  EPIC: "cd2afc",
  RARE: "43abde",
  COMMON: "47f2a0",
  DEFAULT: "ffffff",
};
const rarityOrder = ["PARANORMAL", "MYTHICAL", "LEGENDARY", "EPIC", "RARE", "COMMON"];
const sellRarities = [
  { key: "common", name: "COMMON", code: "wnMwNm" },
  { key: "rare", name: "RARE", code: "wwMmnWWN" },
  { key: "epic", name: "EPIC", code: "wwMmnWN" },
  { key: "legendary", name: "LEGENDARY", code: "wmnNwMWW" },
  { key: "mythical", name: "MYTHICAL", code: "wMWwnNW" },
  { key: "paranormal", name: "PARANORMAL", code: "wmWNwWM" },
];

async function fetchOpenerList() {
  const response = await fetch(openerListUrl);
  if (!response.ok) throw new Error("Failed to fetch opener list");
  return response.json();
}

async function addOpenerList() {
  const select = document.getElementById("opener");
  if (!select) return;

  select.innerHTML = '<option value="none">None</option>';
  try {
    const data = await fetchOpenerList();
    data.chests.forEach((chest) => {
      const option = document.createElement("option");
      option.value = `Chest_${chest.name}`;
      option.textContent = chest.name;
      select.appendChild(option);
    });

    const allChests = document.createElement("option");
    allChests.value = "Chest_All";
    allChests.textContent = "All Chests";
    select.appendChild(allChests);

    data.cards.forEach((card) => {
      const option = document.createElement("option");
      option.value = `Card_${card.name.replace(/\s+/g, "")}`;
      option.textContent = card.name;
      select.appendChild(option);
    });

    const allCards = document.createElement("option");
    allCards.value = "Card_All";
    allCards.textContent = "All Cards";
    select.appendChild(allCards);

    const stopOption = document.createElement("option");
    stopOption.value = "Stop";
    stopOption.textContent = "Stop";
    select.appendChild(stopOption);
  } catch (error) {
    console.error("[Opener] Could not load chest and card list:", error);
  }
}

function selectedItems(data, value) {
  if (value === "Chest_All") return data.chests.map((item) => ({ id: item.chestid, name: item.name, type: "chest" }));
  if (value === "Card_All") return data.cards.map((item) => ({ id: item.cardid, name: item.name, type: "card" }));

  if (value.startsWith("Chest_")) {
    const name = value.slice("Chest_".length);
    const item = data.chests.find((chest) => chest.name === name);
    return item ? [{ id: item.chestid, name: item.name, type: "chest" }] : [];
  }

  if (value.startsWith("Card_")) {
    const name = value.slice("Card_".length);
    const item = data.cards.find((card) => card.name.replace(/\s+/g, "") === name);
    return item ? [{ id: item.cardid, name: item.name, type: "card" }] : [];
  }

  return [];
}

function readSellCodes() {
  return new Set(
    sellRarities
      .filter(({ key }) => document.getElementById(`opener-sell-${key}`)?.checked)
      .map(({ code }) => code),
  );
}

function notify(text, displayMs, color) {
  const holder = document.getElementsByClassName("vue-notification-group")[0]?.children[0];
  if (!holder) return;

  const wrapper = document.createElement("div");
  wrapper.className = "vue-notification-wrapper";
  wrapper.style.cssText = "transition-timing-function:ease;transition-delay:0s;transition-property:all";
  const alert = document.createElement("div");
  alert.className = "alert-default";
  alert.style.cssText = "display:flex;align-items:center;padding:.9rem 1.1rem;margin-bottom:.5rem;color:var(--white);cursor:pointer;box-shadow:0 0 .7rem rgba(0,0,0,.25);border-radius:.2rem;background:linear-gradient(262.54deg,#202639 9.46%,#223163 100.16%);margin-left:1rem;border:solid .15rem var(--WwNnWwmM-1);font-family:'Exo 2'";
  const span = document.createElement("span");
  span.className = "text";
  span.textContent = text;
  if (color) span.style.color = `#${color}`;
  alert.appendChild(span);
  wrapper.appendChild(alert);
  wrapper.addEventListener("click", () => wrapper.remove());
  holder.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), displayMs);
}

function loadConfetti() {
  if (document.getElementById("konfettijs")) return;
  const script = document.createElement("script");
  script.id = "konfettijs";
  script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
  document.head.appendChild(script);
}

function confettiAnimation() {
  if (typeof window.confetti !== "function") return;
  const duration = 15000;
  const end = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
  const randomInRange = (min, max) => Math.random() * (max - min) + min;
  const interval = setInterval(() => {
    const timeLeft = end - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
    const particleCount = 50 * (timeLeft / duration);
    window.confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    window.confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

async function runOpener(items, sellCodes, controls) {
  if (window.__kirkaOpenerRunning) return;

  const token = localStorage.getItem("token");
  if (!token) {
    controls.status.textContent = "Log in to Kirka before opening items.";
    return;
  }

  window.__kirkaOpenerRunning = true;
  controls.select.disabled = false;
  controls.stop.disabled = false;

  const state = { cancelled: false };
  window.__stopOpener = () => {
    state.cancelled = true;
    controls.status.textContent = "Stopping after the current open...";
  };

  const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const authHeaders = (extra) => Object.assign({ accept: "application/json", authorization: `Bearer ${token}` }, extra || {});
  let translations;
  let bvl = [];

  async function loadTranslations() {
    const response = await fetch(translationsUrl);
    if (!response.ok) throw new Error("Could not load API translations");
    const data = await response.json();
    Object.keys(data).forEach((key) => {
      data[data[key]] = key;
    });
    translations = data;
  }

  async function loadBvl() {
    try {
      const response = await fetch("https://opensheet.elk.sh/1tzHjKpu2gYlHoCePjp6bFbKBGvZpwDjiRzT9ZUfNwbY/Alphabetical");
      if (response.ok) bvl = await response.json();
    } catch { }
  }

  async function fetchInventory() {
    const response = await fetch(`https://api2.kirka.io/api/${translations.inventory}`, { headers: authHeaders() });
    if (!response.ok) throw new Error("Could not read your inventory (are you logged in?)");
    const inventory = await response.json();
    if (!Array.isArray(inventory)) throw new Error("Could not read your inventory (are you logged in?)");
    return inventory;
  }

  function detectInventoryFields(inventory) {
    for (const entry of inventory) {
      if (!entry || typeof entry !== "object") continue;
      const itemKey = Object.keys(entry).find((key) => entry[key] && typeof entry[key] === "object");
      if (!itemKey) continue;
      const item = entry[itemKey];
      const fields = Object.keys(item);
      const nameKey = fields.find((key) => item[key] === "Elizabeth" || item[key] === "James");
      const idKey = fields.find((key) => item[key] === "a1055b22-18ca-4cb9-8b39-e46bb0151185" || item[key] === "6be53225-952a-45d7-a862-d69290e4348e");
      if (nameKey) translations.name = nameKey;
      if (idKey) translations.id = idKey;
      translations.item = itemKey;
      if (translations.id && translations.name) return;
    }
  }

  function ownsItem(item, inventory) {
    return !!translations.item && !!translations.id && inventory.some((entry) => entry?.[translations.item]?.[translations.id] === item.id);
  }

  async function postOpen(endpoint, id) {
    const body = { [translations.id]: id };
    const response = await fetch(`https://api2.kirka.io/api/${translations.inventory}/${translations[endpoint]}`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json;charset=UTF-8" }),
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async function openItem(item) {
    try {
      const result = await postOpen(item.type === "chest" ? "openChest" : "openCharacterCard", item.id);
      if (item.type === "chest") return result;
      let drop = {};
      if (Array.isArray(result)) {
        result.forEach((entry) => {
          Object.keys(entry).forEach((key) => {
            if (entry[key] === true) drop = entry;
          });
        });
      }
      return drop;
    } catch {
      return {};
    }
  }

  function rarityFor(rawRarity, itemName) {
    let rarity = translations[rawRarity];
    if (rarity === undefined) {
      rarity = bvl.find((entry) => entry?.["Skin Name"] === itemName && entry.Rarity)?.Rarity || "Unknown-Rarity";
    }
    return String(rarity).toUpperCase();
  }

  function showcase(resultName, rawRarity, itemName, wasSold) {
    const rarity = rarityFor(rawRarity, resultName);
    const color = rarityColors[rarity] || rarityColors.DEFAULT;
    const text = `${rarity} ${resultName}${wasSold ? " (sold)" : ""} from: ${itemName}`;
    console.log(`%c${text}`, `color: #${color}`);
    notify(text, 5000, color);
    return rarity;
  }

  async function sellItem(id) {
    try {
      const response = await fetch(sellUrl, {
        method: "POST",
        headers: authHeaders({ "content-type": "application/json;charset=UTF-8" }),
        body: JSON.stringify({ WwwnmW: id, wnMwWmW: 1 }),
      });
      let json = null;
      try {
        json = await response.json();
      } catch { }
      if (json?.code === 9910) return { ok: false, rateLimited: true };
      return { ok: response.ok, rateLimited: false };
    } catch {
      return { ok: false, rateLimited: false };
    }
  }

  function logSummary(opened) {
    console.log("%c--- Opener Summary ---", "color: #FFFFFF; background-color: #000000; font-weight: bold; font-size: 1.2em; padding: 2px;");
    Object.keys(opened)
      .sort((a, b) => {
        const indexA = rarityOrder.indexOf(a);
        const indexB = rarityOrder.indexOf(b);
        return (indexA < 0 ? rarityOrder.length : indexA) - (indexB < 0 ? rarityOrder.length : indexB);
      })
      .forEach((rarity) => {
        const counts = opened[rarity].reduce((result, name) => {
          result[name] = (result[name] || 0) + 1;
          return result;
        }, {});
        const summary = Object.entries(counts).map(([name, count]) => `${name} x${count}`).join(", ");
        console.log(`%c${opened[rarity].length}x ${rarity}: ${summary}`, `color: #${rarityColors[rarity] || rarityColors.DEFAULT}; font-weight: bold;`);
      });
  }

  try {
    loadConfetti();
    await Promise.all([loadTranslations(), loadBvl()]);
    const inventory = await fetchInventory();
    detectInventoryFields(inventory);
    if (!translations.id || !translations.item) throw new Error("Could not identify inventory fields");

    const availableItems = items.filter((item) => ownsItem(item, inventory));
    if (!availableItems.length) {
      controls.status.textContent = "No selected chests or cards found in your inventory.";
      notify("No selected chests or cards found in your inventory", 5000);
      return;
    }

    const opened = {};
    const soldByRarity = {};
    let sold = 0;
    let sellFailures = 0;
    let sellStopped = false;
    let total = 0;
    const failedAttempts = new Array(availableItems.length).fill(0);
    let index = 0;

    while (!state.cancelled && failedAttempts.some((failures) => failures < 2)) {
      const item = availableItems[index];
      let rateLimited = false;

      if (failedAttempts[index] < 2) {
        const result = await openItem(item);
        const resultName = result[translations.name];
        const rawRarity = result[translations.rarity] ?? result.wnMwWmWN;

        if (resultName) {
          const rarity = rarityFor(rawRarity, resultName);
          if (!opened[rarity]) opened[rarity] = [];
          opened[rarity].push(resultName);
          total++;

          if (rarity === "MYTHICAL" || rarity === "PARANORMAL") confettiAnimation();

          let wasSold = false;
          const skinId = result.WwwnmW ?? result[translations.id];
          const rarityCode = sellRarities.find((entry) => entry.name === rarity)?.code;
          if (sellCodes.has(rarityCode) && skinId && !sellStopped) {
            let outcome = await sellItem(skinId);
            if (outcome.rateLimited) {
              controls.status.textContent = "Sell rate limit reached; retrying...";
              await sleep(rateLimitPauseMs);
              outcome = await sellItem(skinId);
            }
            if (outcome.ok) {
              sold++;
              wasSold = true;
              sellFailures = 0;
              soldByRarity[rarity] = (soldByRarity[rarity] || 0) + 1;
              console.log(`[Opener] sold ${resultName}`);
            } else {
              sellFailures++;
              console.warn(`[Opener] could not sell ${resultName}`);
              notify(`Could not sell ${resultName}`, 5000);
              if (sellFailures >= maxSellFails) {
                sellStopped = true;
                console.warn(`[Opener] auto-sell stopped after ${maxSellFails} failed requests.`);
                notify("Auto-sell stopped after repeated failures", 10000);
              }
            }
          }
          showcase(resultName, rawRarity, item.name, wasSold);
        } else if (result.code === 9910) {
          console.warn("[Opener] open rate limit reached.");
          rateLimited = true;
        } else {
          failedAttempts[index]++;
          console.warn(`[Opener] ${item.name} unavailable (${failedAttempts[index]}/2).`);
        }
      }

      index = (index + 1) % availableItems.length;
      if (!state.cancelled && failedAttempts.some((failures) => failures < 2)) {
        await sleep(delayMs + (rateLimited ? rateLimitPauseMs : 0));
      }
    }

    logSummary(opened);
    const soldSummary = Object.entries(soldByRarity).map(([rarity, count]) => `${count}x ${rarity}`).join(", ");
    controls.status.textContent = `${state.cancelled ? "Stopped" : "Finished"}. Opened ${total}; sold ${sold}${soldSummary ? ` (${soldSummary})` : ""}.`;
    notify(`${state.cancelled ? "Stopped" : "Finished"}, opened ${total}. Check the console for the summary.`, 15000);
    window.__openerResult = { opened, total, sold, cancelled: state.cancelled };
  } catch (error) {
    console.error("[Opener]", error);
    controls.status.textContent = `Opener error: ${error.message || error}`;
  } finally {
    window.__kirkaOpenerRunning = false;
    window.__stopOpener = null;
    controls.select.disabled = false;
    controls.stop.disabled = true;
  }
}

function opener() {
  const select = document.getElementById("opener");
  const stopButton = document.getElementById("stop-opener");
  const status = document.getElementById("opener-status");
  if (!select || !stopButton || !status || select.dataset.openerBound) return;

  select.dataset.openerBound = "true";
  stopButton.disabled = true;

  select.addEventListener("change", async () => {
    const value = select.value;
    if (value === "none") return;
    if (value === "Stop") {
      window.__stopOpener?.();
      select.value = "none";
      return;
    }
    if (window.__kirkaOpenerRunning) {
      status.textContent = "An opener is already running. Stop it before starting another.";
      select.value = "none";
      return;
    }

    const sellCodes = readSellCodes();
    if (sellCodes.size) {
      const names = sellRarities.filter((entry) => sellCodes.has(entry.code)).map((entry) => entry.name).join(", ");
      if (!window.confirm(`Auto-sell is irreversible. Open and sell these rarities: ${names}?`)) {
        select.value = "none";
        return;
      }
    }

    status.textContent = "Loading chest and card list...";
    try {
      const data = await fetchOpenerList();
      const items = selectedItems(data, value);
      if (!items.length) {
        status.textContent = "No opener items selected.";
        select.value = "none";
        return;
      }
      runOpener(items, sellCodes, { select, stop: stopButton, status });
    } catch (error) {
      console.error("[Opener]", error);
      status.textContent = `Opener error: ${error.message || error}`;
      select.value = "none";
    }
  });

  stopButton.addEventListener("click", () => window.__stopOpener?.());
}

document.addEventListener("DOMContentLoaded", addOpenerList);

module.exports = { addOpenerList, opener };
