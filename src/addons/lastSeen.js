function initLastSeen(initiallyEnabled) {
  let stop = null;

  const setEnabled = (enabled) => {
    if (enabled && !stop) {
      stop = startLastSeen();
    } else if (!enabled && stop) {
      stop();
      stop = null;
    }
  };

  const onSettingsChanged = ({ detail }) => {
    if (detail.setting === "last_seen_public_game") setEnabled(detail.value);
  };

  document.addEventListener("juice-settings-changed", onSettingsChanged);
  setEnabled(initiallyEnabled);

  return () => {
    document.removeEventListener("juice-settings-changed", onSettingsChanged);
    setEnabled(false);
  };
}

function startLastSeen() {
  const BIO_SELECTOR = "#profile-modal-modal .card.bio";
  const ID_SELECTOR = "#profile-modal-modal .card-profile .value";

  const cache = {};
  let shortId = null;
  let el = null;
  let lastSeen;
  let rafId = 0;
  let stopped = false;

  async function fetchType(id, type) {
    try {
      const res = await fetch("https://api2.kirka.io/api/wwMmWW/wWwMnWN", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.token,
        },
        body: JSON.stringify({ WwwnmW: id, wmnwWM: true, wMWwnNmW: type }),
      });
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    } catch {
      return [];
    }
  }

  async function getLastSeen(id) {
    const results = await Promise.all([0, 1, 5].map((type) => fetchType(id, type)));
    const times = results.flat().map((item) => Date.parse(item.wmnNwWM)).filter(Boolean);
    return times.length ? Math.max(...times) : null;
  }

  function ago(timestamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days) return days + "d " + (hours % 24) + "h ago";
    if (hours) return hours + "h " + (minutes % 60) + "m ago";
    if (minutes) return minutes + "m " + (seconds % 60) + "s ago";
    return seconds + "s ago";
  }

  // Returns the element's effective opacity (product of all ancestors),
  // or 0 if it is hidden in any way.
  function effectiveOpacity(node) {
    let opacity = 1;
    for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden") return 0;
      opacity *= parseFloat(s.opacity);
    }
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return 0;
    return opacity;
  }

  function removeEl() {
    if (el) el.remove();
    el = null;
    shortId = null;
    lastSeen = undefined;
  }

  function update() {
    if (!el) return;

    const bio = document.querySelector(BIO_SELECTOR);
    const opacity = bio ? effectiveOpacity(bio) : 0;

    if (!bio || opacity <= 0.01) {
      el.style.display = "none";
      return;
    }

    el.textContent =
      "Last seen in a Public game: " +
      (lastSeen === undefined ? "loading..." : lastSeen ? ago(lastSeen) : "unknown");

    const rect = bio.getBoundingClientRect();
    const styles = getComputedStyle(bio);
    Object.assign(el.style, {
      display: "block",
      opacity: String(opacity),
      left: rect.left + "px",
      width: rect.width + "px",
      top: rect.bottom + 4 + "px",
      color: styles.color,
      font: styles.font,
      textAlign: styles.textAlign,
      textShadow: styles.textShadow,
    });
  }

  async function check() {
    if (stopped) return;

    const value = document.querySelector(ID_SELECTOR);
    const bio = document.querySelector(BIO_SELECTOR);
    const id = value && bio && value.textContent.replace("#", "").trim();

    if (!id) {
      removeEl();
      return;
    }

    if (id !== shortId || !el || !el.isConnected) {
      shortId = id;
      if (el) el.remove();
      el = document.createElement("div");
      el.style.cssText = "position:fixed;z-index:99999;pointer-events:none;margin:0";
      document.body.appendChild(el);

      lastSeen = id in cache ? cache[id] : undefined;
      update();

      if (!(id in cache)) {
        const result = await getLastSeen(id);
        cache[id] = result;
        // Ignore the result if the modal closed or switched profiles meanwhile
        if (!stopped && shortId === id) lastSeen = result;
      }
    }
  }

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });

  // Per-frame tracking so the label follows the modal's fade/slide animations
  function loop() {
    if (stopped) return;
    update();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  check();

  return () => {
    stopped = true;
    observer.disconnect();
    cancelAnimationFrame(rafId);
    removeEl();
  };
}

module.exports = { initLastSeen };