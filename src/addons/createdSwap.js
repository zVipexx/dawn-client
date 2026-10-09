function initCreatedSwap(initiallyEnabled) {
  let stop = null;

  const setEnabled = (enabled) => {
    if (enabled && !stop) {
      stop = startCreatedSwap();
    } else if (!enabled && stop) {
      stop();
      stop = null;
    }
  };

  const onSettingsChanged = ({ detail }) => {
    if (detail.setting === "profile_stat_swaps") setEnabled(detail.value);
  };

  document.addEventListener("juice-settings-changed", onSettingsChanged);
  setEnabled(initiallyEnabled);

  return () => {
    document.removeEventListener("juice-settings-changed", onSettingsChanged);
    setEnabled(false);
  };
}

function startCreatedSwap() {
  if (window.__createdSwapCleanup) window.__createdSwapCleanup();

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let current = null;
  let saved = null;

  const fmtDate = (date) => `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  const nameOf = (stat) => {
    const name = stat.querySelector(".stat-name");
    return name ? name.textContent.trim().toLowerCase() : "";
  };

  const toNum = (text) => {
    const number = parseInt(String(text).replace(/[^\d]/g, ""), 10);
    return Number.isNaN(number) ? null : number;
  };

  function numberOf(stat, names) {
    const card = stat.closest(".statistics");
    if (!card) return null;
    for (const other of card.querySelectorAll(".statistic")) {
      if (names.includes(nameOf(other))) {
        const value = other.querySelector(".stat-value");
        return value ? toNum(value.textContent) : null;
      }
    }
    return null;
  }

  const GAMES = ["games", "played"];
  const WINS = ["win", "won"];
  const pct = (a, b) => (a == null || !b ? null : ((a / b) * 100).toFixed(1) + "%");
  const ratio = (a, b) => (a == null || !b ? null : (a / b).toFixed(2));

  const swaps = {
    created(_stat, value) {
      const match = value.textContent.match(/(\d+)\s*day/i);
      return match ? fmtDate(new Date(Date.now() - parseInt(match[1], 10) * 86400000)) : null;
    },
    win(stat, value) {
      return pct(toNum(value.textContent), numberOf(stat, GAMES));
    },
    headshots(stat, value) {
      return pct(toNum(value.textContent), numberOf(stat, ["kills"]));
    },
    kills(stat, value) {
      const perGame = ratio(toNum(value.textContent), numberOf(stat, GAMES));
      return perGame && perGame + " /game";
    },
    deaths(stat, value) {
      const perGame = ratio(toNum(value.textContent), numberOf(stat, GAMES));
      return perGame && perGame + " /game";
    },
    games(stat, value) {
      const games = toNum(value.textContent);
      const wins = numberOf(stat, WINS);
      return games != null && wins != null ? games - wins + " lost" : null;
    },
    scores(stat, value) {
      const scores = toNum(value.textContent);
      const games = numberOf(stat, GAMES);
      return scores != null && games ? Math.round(scores / games).toLocaleString("en-US") + " /game" : null;
    },
  };
  swaps.won = swaps.win;
  swaps.played = swaps.games;

  function restore() {
    if (!saved) return;
    saved.value.textContent = saved.text;
    saved.value.style.whiteSpace = saved.whiteSpace;
    saved.stat.style.width = saved.width;
    saved.stat.style.height = saved.height;
    saved = null;
    current = null;
  }

  function onOver(event) {
    const stat = event.target.closest && event.target.closest(".statistic");
    if (!stat || stat === current) return;

    const swap = swaps[nameOf(stat)];
    if (!swap) return;

    const value = stat.querySelector(".stat-value");
    if (!value) return;

    const text = swap(stat, value);
    if (!text) return;

    restore();
    current = stat;
    const rect = stat.getBoundingClientRect();
    saved = {
      stat,
      value,
      text: value.textContent,
      width: stat.style.width,
      height: stat.style.height,
      whiteSpace: value.style.whiteSpace,
    };

    stat.style.width = rect.width + "px";
    stat.style.height = rect.height + "px";
    value.style.whiteSpace = "nowrap";
    value.textContent = text;
  }

  function onOut(event) {
    if (!current) return;
    if (event.relatedTarget && current.contains(event.relatedTarget)) return;
    restore();
  }

  function cleanup() {
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("mouseout", onOut, true);
    restore();
    if (window.__createdSwapCleanup === cleanup) window.__createdSwapCleanup = null;
  }

  document.addEventListener("mouseover", onOver, true);
  document.addEventListener("mouseout", onOut, true);
  window.__createdSwapCleanup = cleanup;

  return cleanup;
}

module.exports = { initCreatedSwap };