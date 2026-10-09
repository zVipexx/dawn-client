const PROFILE_MODAL = "#profile-modal-modal";
const ROLE_CARD_CLASS = "role-klo-card";
const ROLE_MAPPING_URL = "https://raw.githubusercontent.com/OBS-Akuma/Ubuntu-client/refs/heads/main/assets/roledata.json";
const USER_DATA_URL = "https://api2.kirka.io/api/wwMmWW/wmWNn";

function roleDisplayAddon(initiallyEnabled) {
  let stop = null;

  const setEnabled = (enabled) => {
    if (enabled && !stop) {
      stop = startRoleDisplay();
    } else if (!enabled && stop) {
      stop();
      stop = null;
    }
  };

  const onSettingsChanged = ({ detail }) => {
    if (detail.setting === "role_display_enabled") setEnabled(detail.value);
  };

  document.addEventListener("juice-settings-changed", onSettingsChanged);
  setEnabled(initiallyEnabled);

  return () => {
    document.removeEventListener("juice-settings-changed", onSettingsChanged);
    setEnabled(false);
  };
}

function startRoleDisplay() {
  let roleMappingPromise;
  let activeId = null;
  let loadingId = null;
  let requestVersion = 0;

  function getUserId(modal) {
    const value = modal.querySelector(".copy-cont .value");
    if (!value) return null;
    const text = value.textContent.trim();
    const hashIndex = text.lastIndexOf("#");
    const userId = hashIndex >= 0 ? text.slice(hashIndex + 1).trim() : text.replace(/^#/, "");
    return userId || null;
  }

  function fetchRoleMapping() {
    if (!roleMappingPromise) {
      roleMappingPromise = fetch(ROLE_MAPPING_URL)
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
    }
    return roleMappingPromise;
  }

  async function fetchUserData(userId) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const response = await fetch(USER_DATA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ WwwnmW: userId, wmnwWM: true }),
      });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  function getDisplayRole(userData, roleMapping) {
    if (userData.wwMmWnNW === "wnMNwWm") return { text: "BANNED", isBanned: true };

    const roleCode = userData.wMwnm || null;
    if (!roleCode) return { text: "USER", isBanned: false };
    if (roleMapping?.[roleCode]) return { text: roleMapping[roleCode], isBanned: false };
    if (roleCode === "000000") return { text: "OWNER", isBanned: false };
    return { text: roleMapping ? roleCode : "USER", isBanned: false };
  }

  function createRoleCard(modal, userData, roleMapping, userId) {
    const sourceCard = modal.querySelector(".card.k-d");
    if (!sourceCard || !userData) return;

    modal.querySelector(`.${ROLE_CARD_CLASS}`)?.remove();
    const roleInfo = getDisplayRole(userData, roleMapping);
    const card = sourceCard.cloneNode(true);
    card.className = `card k-d ${ROLE_CARD_CLASS}`;
    card.dataset.userId = userId;

    const statName = card.querySelector(".stat-name");
    if (statName) {
      const label = document.createElement("div");
      label.setAttribute("data-v-7f0e55d0", "");
      label.className = "stat-name text-2 klo";
      label.appendChild(document.createTextNode("ROLE"));
      const popover = document.createElement("div");
      popover.setAttribute("data-v-5c854b68", "");
      popover.setAttribute("data-v-7f0e55d0", "");
      popover.className = "v-popover";
      label.appendChild(popover);
      statName.replaceWith(label);
    }

    const statValue = card.querySelector(".stat-value");
    if (statValue) {
      statValue.textContent = roleInfo.text;
      statValue.style.fontSize = "";
      if (roleInfo.isBanned) {
        statValue.style.color = "var(--red-3)";
        statValue.style.textDecoration = "line-through";
      } else {
        statValue.style.color = userData.wmnNM || "";
        statValue.style.textDecoration = "none";
      }
    }

    sourceCard.after(card);
  }

  async function update() {
    const modal = document.querySelector(PROFILE_MODAL);
    if (!modal) {
      activeId = null;
      loadingId = null;
      requestVersion++;
      return;
    }

    const userId = getUserId(modal);
    if (!userId || !modal.querySelector(".card.k-d")) return;

    const existingCard = modal.querySelector(`.${ROLE_CARD_CLASS}`);
    if (userId === activeId && (existingCard?.dataset.userId === userId || loadingId === userId)) return;

    activeId = userId;
    loadingId = userId;
    const version = ++requestVersion;
    existingCard?.remove();

    const [roleMapping, userData] = await Promise.all([fetchRoleMapping(), fetchUserData(userId)]);
    if (version !== requestVersion || !modal.isConnected || getUserId(modal) !== userId) return;

    loadingId = null;
    if (userData) createRoleCard(modal, userData, roleMapping, userId);
  }

  const observer = new MutationObserver(update);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  update();

  return () => {
    observer.disconnect();
    requestVersion++;
    document.querySelectorAll(`${PROFILE_MODAL} .${ROLE_CARD_CLASS}`).forEach((card) => card.remove());
  };
}

module.exports = { roleDisplayAddon };