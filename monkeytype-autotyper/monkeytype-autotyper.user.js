// ==UserScript==
// @name         Monkeytype Autotyper
// @namespace    https://monkeytype.com/
// @version      1.1.0
// @description  Floating autotyper panel for monkeytype with WPM, jitter, random speed, intentional errors and F8/F9 hotkeys.
// @match        https://monkeytype.com/*
// @match        https://www.monkeytype.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  if (window.__MT_AUTOTYPER_USERSCRIPT__) return;
  window.__MT_AUTOTYPER_USERSCRIPT__ = true;

  const DEFAULTS = {
    wpm: 120,
    jitter: 15,
    fixErrors: true,
    randomWpm: false,
    wpmMin: 80,
    wpmMax: 160,
    errorMode: false,
    errorCount: 3,
    hidden: false,
    x: null,
    y: null,
  };

  const LOCAL_KEY = "mtat_userscript_settings_v1";
  const ZEN_TEXT =
    "The quick brown fox jumps over the lazy dog while the early morning sun paints the rooftops gold. " +
    "She counted 27 red balloons drifting above the harbor, and none of them seemed willing to come down. " +
    "Programming is the art of telling another human what one wants the computer to do; clarity beats cleverness every single time.";

  const CSS = `
#mtat-panel {
  position: fixed;
  z-index: 2147483647;
  width: 292px;
  border-radius: 12px;
  background: rgba(18, 20, 26, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  color: #e6e8ee;
  font-family: "Lexend Deca", "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.35;
  user-select: none;
  -webkit-user-select: none;
  box-sizing: border-box;
}
#mtat-panel *, #mtat-panel *::before, #mtat-panel *::after { box-sizing: border-box; }
#mtat-panel .mtat-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  cursor: grab; touch-action: none;
}
#mtat-panel .mtat-head:active { cursor: grabbing; }
#mtat-panel .mtat-brand {
  display: flex; align-items: center; gap: 8px;
  font-weight: 600; letter-spacing: 0.02em; color: #f4f5f8;
}
#mtat-panel .mtat-logo {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 7px;
  background: linear-gradient(140deg, #e2b714, #b58f0b);
  color: #17181c; font-size: 10px; font-weight: 800;
}
#mtat-panel .mtat-status {
  display: inline-flex; align-items: center; gap: 6px; min-width: 0;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05); color: #aeb4c2;
  font-size: 11px; white-space: nowrap;
}
#mtat-panel .mtat-status i {
  width: 7px; height: 7px; border-radius: 50%; background: #6b7280;
  flex: 0 0 auto; box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.15);
}
#mtat-panel .mtat-status b { font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
#mtat-panel .mtat-status[data-state="waiting"] i { background: #e2b714; box-shadow: 0 0 0 2px rgba(226, 183, 20, 0.18); }
#mtat-panel .mtat-status[data-state="typing"] i { background: #4ade80; box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.18); animation: mtat-pulse 1.1s ease-in-out infinite; }
#mtat-panel .mtat-status[data-state="done"] i { background: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.18); }
#mtat-panel .mtat-status[data-state="error"] i { background: #f87171; box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.18); }
#mtat-panel .mtat-status[data-state="stopped"] i { background: #94a3b8; box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.18); }
@keyframes mtat-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.82); }
}
#mtat-panel .mtat-body { padding: 12px; }
#mtat-panel .mtat-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
#mtat-panel .mtat-row.mtat-gap { margin-top: 12px; }
#mtat-panel .mtat-row label { color: #c3c8d4; font-size: 12px; }
#mtat-panel .mtat-value { display: flex; align-items: center; gap: 5px; color: #8f96a6; font-size: 11px; }
#mtat-panel #mtat-wpm-num {
  width: 58px; padding: 3px 6px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05);
  color: #f1f3f8; font-family: inherit; font-size: 12px; font-weight: 600;
  text-align: right; outline: none; -moz-appearance: textfield;
}
#mtat-panel #mtat-wpm-num::-webkit-outer-spin-button,
#mtat-panel #mtat-wpm-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
#mtat-panel #mtat-wpm-num:focus { border-color: rgba(226, 183, 20, 0.55); box-shadow: 0 0 0 2px rgba(226, 183, 20, 0.12); }
#mtat-panel #mtat-jitter-out { color: #f1f3f8; font-weight: 600; font-variant-numeric: tabular-nums; }
#mtat-panel input[type="range"] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 18px;
  margin: 7px 0 0; background: transparent; outline: none; cursor: pointer;
}
#mtat-panel input[type="range"]::-webkit-slider-runnable-track {
  height: 4px; border-radius: 999px;
  background: linear-gradient(90deg, #e2b714, #8a6d0a);
}
#mtat-panel input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
  margin-top: -5px; border-radius: 50%; background: #f4f5f8;
  border: 2px solid #e2b714; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
#mtat-panel input[type="range"]::-moz-range-track {
  height: 4px; border-radius: 999px;
  background: linear-gradient(90deg, #e2b714, #8a6d0a);
}
#mtat-panel input[type="range"]::-moz-range-thumb {
  width: 12px; height: 12px; border-radius: 50%;
  background: #f4f5f8; border: 2px solid #e2b714;
}
#mtat-panel .mtat-check {
  display: flex; align-items: center; gap: 8px; margin-top: 12px;
  color: #c3c8d4; font-size: 12px; cursor: pointer;
}
#mtat-panel .mtat-check input {
  -webkit-appearance: none; appearance: none; width: 15px; height: 15px;
  margin: 0; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05); cursor: pointer;
  position: relative; flex: 0 0 auto;
}
#mtat-panel .mtat-check input:checked { background: #e2b714; border-color: #e2b714; }
#mtat-panel .mtat-check input:checked::after {
  content: ""; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px;
  border: solid #17181c; border-width: 0 2px 2px 0; transform: rotate(42deg);
}
#mtat-panel .mtat-actions { display: flex; gap: 8px; margin-top: 14px; }
#mtat-panel .mtat-btn {
  flex: 1; height: 34px; border-radius: 8px; border: 1px solid transparent;
  font-family: inherit; font-size: 12px; font-weight: 700;
  letter-spacing: 0.03em; text-transform: uppercase; cursor: pointer;
  transition: transform 0.08s ease, filter 0.12s ease, opacity 0.12s ease;
}
#mtat-panel .mtat-btn:active:not(:disabled) { transform: translateY(1px); }
#mtat-panel .mtat-btn:disabled { opacity: 0.38; cursor: default; }
#mtat-panel .mtat-start { background: linear-gradient(140deg, #e2b714, #c39a0c); color: #17181c; }
#mtat-panel .mtat-start:hover:not(:disabled) { filter: brightness(1.08); }
#mtat-panel .mtat-stop {
  background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.1);
  color: #e6e8ee;
}
#mtat-panel .mtat-stop:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.16); border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
}
#mtat-panel .mtat-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: 10px; color: #767d8c; font-size: 10.5px;
}
#mtat-panel .mtat-mode {
  padding: 2px 6px; border-radius: 4px;
  background: rgba(74, 222, 128, 0.12); color: #86efac;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
}
#mtat-panel .mtat-mode[data-mode="fallback"] {
  background: rgba(251, 191, 36, 0.12); color: #fcd34d;
}
#mtat-panel #mtat-wpm-min, #mtat-panel #mtat-wpm-max, #mtat-panel #mtat-error-count {
  width: 58px; padding: 3px 6px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05);
  color: #f1f3f8; font-family: inherit; font-size: 12px; font-weight: 600;
  text-align: right; outline: none; -moz-appearance: textfield;
}
#mtat-panel #mtat-wpm-min, #mtat-panel #mtat-wpm-max { width: 48px; }
#mtat-panel #mtat-wpm-min::-webkit-outer-spin-button,
#mtat-panel #mtat-wpm-min::-webkit-inner-spin-button,
#mtat-panel #mtat-wpm-max::-webkit-outer-spin-button,
#mtat-panel #mtat-wpm-max::-webkit-inner-spin-button,
#mtat-panel #mtat-error-count::-webkit-outer-spin-button,
#mtat-panel #mtat-error-count::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
#mtat-panel #mtat-wpm-min:focus, #mtat-panel #mtat-wpm-max:focus,
#mtat-panel #mtat-error-count:focus {
  border-color: rgba(226, 183, 20, 0.55); box-shadow: 0 0 0 2px rgba(226, 183, 20, 0.12);
}
#mtat-panel .mtat-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px; background: rgba(255, 255, 255, 0.05);
  color: #c3c8d4; font-family: inherit; font-size: 14px; font-weight: 700;
  line-height: 1; cursor: pointer; flex: 0 0 auto;
}
#mtat-panel .mtat-icon-btn:hover {
  background: rgba(248, 113, 113, 0.16); border-color: rgba(248, 113, 113, 0.35); color: #fecaca;
}
#mtat-panel .mtat-row.mtat-sub { margin-top: 5px; }
#mtat-panel .mtat-row.mtat-sub label { color: #8f96a6; font-size: 11px; }
#mtat-panel input:disabled, #mtat-panel input[type="range"]:disabled { opacity: 0.4; cursor: default; }
#mtat-restore {
  position: fixed; z-index: 2147483647; right: 16px; top: 16px;
  display: none; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 10px;
  background: linear-gradient(140deg, #e2b714, #b58f0b); color: #17181c;
  font-family: "Lexend Deca", "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 11px; font-weight: 800; letter-spacing: -0.02em;
  cursor: pointer; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}
#mtat-restore:hover { filter: brightness(1.08); }
`;

  let settings = { ...DEFAULTS };
  let monkeyConfig = {};
  let panel = null;
  let ui = {};
  let running = false;
  let runId = 0;
  let lastTyped = "";
  let paceFactor = 1;
  let currentTargetWpm = 0;
  let wpmChangeAt = 0;
  let errorPlan = null;
  let errorsMade = 0;
  let lastErrorAt = 0;
  let saveTimer = 0;

  class StopError extends Error {}

  init();

  function init() {
    loadSettings();
    injectCSS();
    buildPanel();
    applySettingsToUI();
    applyPosition();
    bindPanelEvents();
    bindHotkey();
    setStatus("idle", "idle");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function injectCSS() {
    if (document.getElementById("mtat-userscript-style")) return;
    const style = document.createElement("style");
    style.id = "mtat-userscript-style";
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      settings = { ...DEFAULTS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch {
      settings = { ...DEFAULTS };
    }
    settings.wpm = clamp(Number(settings.wpm) || DEFAULTS.wpm, 40, 400);
    settings.jitter = clamp(Number(settings.jitter) || 0, 0, 50);
    settings.fixErrors = settings.fixErrors !== false;
    settings.randomWpm = settings.randomWpm === true;
    settings.wpmMin = clamp(Number(settings.wpmMin) || DEFAULTS.wpmMin, 40, 400);
    settings.wpmMax = clamp(Number(settings.wpmMax) || DEFAULTS.wpmMax, 40, 400);
    if (settings.wpmMin > settings.wpmMax) {
      const swap = settings.wpmMin;
      settings.wpmMin = settings.wpmMax;
      settings.wpmMax = swap;
    }
    settings.errorMode = settings.errorMode === true;
    settings.errorCount = clamp(Math.round(Number(settings.errorCount) || 0), 0, 50);
    settings.hidden = settings.hidden === true;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistSettings, 120);
  }

  function persistSettings() {
    try {
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({
          wpm: settings.wpm,
          jitter: settings.jitter,
          fixErrors: settings.fixErrors,
          randomWpm: settings.randomWpm,
          wpmMin: settings.wpmMin,
          wpmMax: settings.wpmMax,
          errorMode: settings.errorMode,
          errorCount: settings.errorCount,
          hidden: settings.hidden,
          x: settings.x,
          y: settings.y,
        })
      );
    } catch {
      // ignore quota errors
    }
  }

  function buildPanel() {
    const existing = document.getElementById("mtat-panel");
    if (existing) existing.remove();

    panel = document.createElement("div");
    panel.id = "mtat-panel";
    panel.innerHTML = `
      <div class="mtat-head" data-drag>
        <div class="mtat-brand">
          <span class="mtat-logo">MT</span>
          <span>Autotyper</span>
        </div>
        <span class="mtat-status" data-state="idle"><i></i><b>idle</b></span>
        <button id="mtat-hide" class="mtat-icon-btn" type="button" title="Hide (F9)">–</button>
      </div>
      <div class="mtat-body">
        <div class="mtat-row">
          <label for="mtat-wpm">Speed</label>
          <div class="mtat-value">
            <input id="mtat-wpm-num" type="number" min="40" max="400" step="5" value="120">
            <span>WPM</span>
          </div>
        </div>
        <input id="mtat-wpm" type="range" min="40" max="400" step="5" value="120">

        <div class="mtat-row mtat-gap">
          <label for="mtat-jitter">Jitter</label>
          <div class="mtat-value"><output id="mtat-jitter-out">15%</output></div>
        </div>
        <input id="mtat-jitter" type="range" min="0" max="50" step="1" value="15">

        <label class="mtat-check">
          <input id="mtat-fix" type="checkbox" checked>
          <span>Fix wrong chars (backspace)</span>
        </label>

        <label class="mtat-check">
          <input id="mtat-random" type="checkbox">
          <span>Random WPM</span>
        </label>
        <div class="mtat-row mtat-sub">
          <label for="mtat-wpm-min">Range</label>
          <div class="mtat-value">
            <input id="mtat-wpm-min" type="number" min="40" max="400" step="5" value="80">
            <span>–</span>
            <input id="mtat-wpm-max" type="number" min="40" max="400" step="5" value="160">
          </div>
        </div>

        <label class="mtat-check">
          <input id="mtat-errors" type="checkbox">
          <span>Make errors</span>
        </label>
        <div class="mtat-row mtat-sub">
          <label for="mtat-error-count">Errors</label>
          <div class="mtat-value">
            <input id="mtat-error-count" type="number" min="1" max="50" step="1" value="3">
            <span>pcs</span>
          </div>
        </div>

        <div class="mtat-actions">
          <button id="mtat-start" class="mtat-btn mtat-start" type="button">Start</button>
          <button id="mtat-stop" class="mtat-btn mtat-stop" type="button" disabled>Stop</button>
        </div>

        <div class="mtat-foot">
          <span id="mtat-mode" class="mtat-mode" data-mode="synth">SYNTH</span>
          <span>F8 start / F9 hide</span>
        </div>
      </div>
    `;

    (document.documentElement || document.body).appendChild(panel);

    const existingRestore = document.getElementById("mtat-restore");
    if (existingRestore) existingRestore.remove();
    const restore = document.createElement("button");
    restore.id = "mtat-restore";
    restore.type = "button";
    restore.title = "Show Autotyper (F9)";
    restore.textContent = "MT";
    (document.documentElement || document.body).appendChild(restore);

    ui = {
      wpm: panel.querySelector("#mtat-wpm"),
      wpmNum: panel.querySelector("#mtat-wpm-num"),
      jitter: panel.querySelector("#mtat-jitter"),
      jitterOut: panel.querySelector("#mtat-jitter-out"),
      fix: panel.querySelector("#mtat-fix"),
      random: panel.querySelector("#mtat-random"),
      wpmMin: panel.querySelector("#mtat-wpm-min"),
      wpmMax: panel.querySelector("#mtat-wpm-max"),
      errors: panel.querySelector("#mtat-errors"),
      errorCount: panel.querySelector("#mtat-error-count"),
      hide: panel.querySelector("#mtat-hide"),
      restore,
      start: panel.querySelector("#mtat-start"),
      stop: panel.querySelector("#mtat-stop"),
      status: panel.querySelector(".mtat-status"),
      statusText: panel.querySelector(".mtat-status b"),
      mode: panel.querySelector("#mtat-mode"),
      head: panel.querySelector(".mtat-head"),
    };
  }

  function applySettingsToUI() {
    ui.wpm.value = String(settings.wpm);
    ui.wpmNum.value = String(settings.wpm);
    ui.jitter.value = String(settings.jitter);
    ui.jitterOut.textContent = `${settings.jitter}%`;
    ui.fix.checked = settings.fixErrors;
    ui.random.checked = settings.randomWpm;
    ui.wpmMin.value = String(settings.wpmMin);
    ui.wpmMax.value = String(settings.wpmMax);
    ui.errors.checked = settings.errorMode;
    ui.errorCount.value = String(settings.errorCount);
    applyRandomUI();
    applyErrorUI();
    applyHidden();
  }

  function applyRandomUI() {
    const enabled = settings.randomWpm;
    ui.wpm.disabled = enabled;
    ui.wpmNum.disabled = enabled;
    ui.wpmMin.disabled = !enabled;
    ui.wpmMax.disabled = !enabled;
  }

  function applyErrorUI() {
    ui.errorCount.disabled = !settings.errorMode;
  }

  function applyHidden() {
    if (!panel || !ui.restore) return;
    panel.style.display = settings.hidden ? "none" : "";
    ui.restore.style.display = settings.hidden ? "flex" : "none";
  }

  function setHidden(hidden) {
    settings.hidden = Boolean(hidden);
    applyHidden();
    scheduleSave();
  }

  function targetWpmNow() {
    if (!settings.randomWpm) {
      return clamp(Number(settings.wpm) || DEFAULTS.wpm, 40, 400);
    }
    const now = performance.now();
    if (!currentTargetWpm || now >= wpmChangeAt) {
      const min = Math.min(settings.wpmMin, settings.wpmMax);
      const max = Math.max(settings.wpmMin, settings.wpmMax);
      currentTargetWpm = clamp(
        Math.round(randomBetween(min, max) / 5) * 5,
        min,
        max
      );
      wpmChangeAt =
        now + clamp((60000 / (currentTargetWpm * 5)) * 6, 700, 3000);
    }
    return clamp(currentTargetWpm, 40, 400);
  }

  function applyPosition() {
    if (Number.isFinite(settings.x) && Number.isFinite(settings.y)) {
      panel.style.left = `${settings.x}px`;
      panel.style.top = `${settings.y}px`;
      panel.style.right = "auto";
      requestAnimationFrame(clampPanelPosition);
    } else {
      panel.style.left = "auto";
      panel.style.top = "16px";
      panel.style.right = "16px";
    }
  }

  function clampPanelPosition() {
    if (!panel) return null;
    const rect = panel.getBoundingClientRect();
    const maxX = Math.max(4, window.innerWidth - rect.width - 4);
    const maxY = Math.max(4, window.innerHeight - rect.height - 4);
    const x = clamp(rect.left, 4, maxX);
    const y = clamp(rect.top, 4, maxY);
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = "auto";
    return { x, y };
  }

  function bindPanelEvents() {
    ["keydown", "keyup", "keypress", "pointerdown", "mousedown", "click"].forEach((type) => {
      panel.addEventListener(type, (event) => event.stopPropagation());
    });

    ui.wpm.addEventListener("input", () => {
      const value = clamp(parseInt(ui.wpm.value, 10) || DEFAULTS.wpm, 40, 400);
      settings.wpm = value;
      ui.wpmNum.value = String(value);
      scheduleSave();
    });

    ui.wpmNum.addEventListener("input", () => {
      const parsed = parseInt(ui.wpmNum.value, 10);
      if (!Number.isFinite(parsed)) return;
      const value = clamp(parsed, 40, 400);
      settings.wpm = value;
      ui.wpm.value = String(value);
      scheduleSave();
    });

    ui.wpmNum.addEventListener("change", () => {
      const value = clamp(parseInt(ui.wpmNum.value, 10) || DEFAULTS.wpm, 40, 400);
      settings.wpm = value;
      ui.wpmNum.value = String(value);
      ui.wpm.value = String(value);
      scheduleSave();
    });

    ui.jitter.addEventListener("input", () => {
      const value = clamp(parseInt(ui.jitter.value, 10) || 0, 0, 50);
      settings.jitter = value;
      ui.jitterOut.textContent = `${value}%`;
      scheduleSave();
    });

    ui.fix.addEventListener("change", () => {
      settings.fixErrors = ui.fix.checked;
      scheduleSave();
    });

    ui.random.addEventListener("change", () => {
      settings.randomWpm = ui.random.checked;
      currentTargetWpm = 0;
      applyRandomUI();
      scheduleSave();
    });

    const readWpmRange = () => {
      let min = clamp(parseInt(ui.wpmMin.value, 10) || DEFAULTS.wpmMin, 40, 400);
      let max = clamp(parseInt(ui.wpmMax.value, 10) || DEFAULTS.wpmMax, 40, 400);
      if (min > max) {
        const swap = min;
        min = max;
        max = swap;
      }
      settings.wpmMin = min;
      settings.wpmMax = max;
      currentTargetWpm = 0;
      scheduleSave();
    };

    ui.wpmMin.addEventListener("input", readWpmRange);
    ui.wpmMax.addEventListener("input", readWpmRange);
    ui.wpmMin.addEventListener("change", () => {
      readWpmRange();
      ui.wpmMin.value = String(settings.wpmMin);
      ui.wpmMax.value = String(settings.wpmMax);
    });
    ui.wpmMax.addEventListener("change", () => {
      readWpmRange();
      ui.wpmMin.value = String(settings.wpmMin);
      ui.wpmMax.value = String(settings.wpmMax);
    });

    ui.errors.addEventListener("change", () => {
      settings.errorMode = ui.errors.checked;
      applyErrorUI();
      scheduleSave();
    });

    ui.errorCount.addEventListener("input", () => {
      const parsed = parseInt(ui.errorCount.value, 10);
      if (!Number.isFinite(parsed)) return;
      settings.errorCount = clamp(parsed, 0, 50);
      scheduleSave();
    });

    ui.errorCount.addEventListener("change", () => {
      settings.errorCount = clamp(parseInt(ui.errorCount.value, 10) || 0, 0, 50);
      ui.errorCount.value = String(settings.errorCount);
      scheduleSave();
    });

    ui.hide.addEventListener("click", () => setHidden(true));
    ui.restore.addEventListener("click", () => setHidden(false));

    ["keydown", "keyup", "keypress", "pointerdown", "mousedown", "click"].forEach((type) => {
      ui.restore.addEventListener(type, (event) => event.stopPropagation());
    });

    ui.start.addEventListener("click", () => {
      void startTyping();
    });

    ui.stop.addEventListener("click", () => {
      stopTyping("stopped");
    });

    let drag = null;
    ui.head.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
      };
      ui.head.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    ui.head.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const rect = panel.getBoundingClientRect();
      const x = clamp(event.clientX - drag.dx, 4, Math.max(4, window.innerWidth - rect.width - 4));
      const y = clamp(event.clientY - drag.dy, 4, Math.max(4, window.innerHeight - rect.height - 4));
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.right = "auto";
    });

    const endDrag = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      const pos = clampPanelPosition();
      if (pos) {
        settings.x = Math.round(pos.x);
        settings.y = Math.round(pos.y);
        scheduleSave();
      }
    };

    ui.head.addEventListener("pointerup", endDrag);
    ui.head.addEventListener("pointercancel", endDrag);

    window.addEventListener("resize", () => {
      const pos = clampPanelPosition();
      if (pos) {
        settings.x = Math.round(pos.x);
        settings.y = Math.round(pos.y);
      }
    });
  }

  function bindHotkey() {
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.repeat) return;
        if (event.key === "F9" || event.code === "F9") {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          setHidden(!settings.hidden);
          return;
        }
        if (event.key !== "F8" && event.code !== "F8") return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (running) stopTyping("stopped");
        else void startTyping();
      },
      true
    );
  }

  function setStatus(state, text) {
    if (!ui.status) return;
    ui.status.dataset.state = state;
    ui.statusText.textContent = text;
  }

  function setButtons(isRunning) {
    ui.start.disabled = isRunning;
    ui.stop.disabled = !isRunning;
  }

  function readMonkeyConfig() {
    try {
      const raw = localStorage.getItem("config");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function readCustomLimitMode() {
    try {
      const raw = localStorage.getItem("customTextSettings");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.limit && parsed.limit.mode ? parsed.limit.mode : null;
    } catch {
      return null;
    }
  }

  function correctionAllowed() {
    const deleteOnError = monkeyConfig.deleteOnError || "off";
    const confidence = monkeyConfig.confidenceMode || "off";
    const stopOnError = monkeyConfig.stopOnError || "off";
    return deleteOnError === "off" && confidence !== "max" && stopOnError === "off";
  }

  function readCustomTimeLimit() {
    try {
      const raw = localStorage.getItem("customTextSettings");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const value = parsed && parsed.limit ? Number(parsed.limit.value) : NaN;
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  function buildErrorPlan() {
    const count = clamp(Math.round(Number(settings.errorCount) || 0), 0, 50);
    if (!settings.errorMode || count <= 0) return null;
    if (!correctionAllowed()) return null;

    const mode = (monkeyConfig.mode || "").toLowerCase();
    const customTime = mode === "custom" && readCustomLimitMode() === "time";
    if (mode === "time" || customTime) {
      const duration = clamp(
        customTime
          ? readCustomTimeLimit() || Number(monkeyConfig.time) || 30
          : Number(monkeyConfig.time) || 30,
        5,
        3600
      );
      const times = [];
      for (let i = 0; i < count; i++) {
        times.push(randomBetween(duration * 1000 * 0.15, duration * 1000 * 0.85));
      }
      times.sort((a, b) => a - b);
      return { type: "time", times, count };
    }

    const total = document.querySelectorAll("#words .word").length;
    if (total <= 2) return null;
    const indices = new Set();
    const targetCount = Math.min(count, total - 1);
    let guard = 0;
    while (indices.size < targetCount && guard++ < 500) {
      indices.add(1 + Math.floor(Math.random() * (total - 1)));
    }
    return { type: "words", indices, charIndex: new Map(), count: targetCount };
  }

  function shouldMakeMistake(wordIndex, charIndex, ch, text, typedCount, startedAt) {
    if (!errorPlan || errorsMade >= errorPlan.count) return false;
    if (ch === " " || ch === "\n" || ch === "\t") return false;
    if (typedCount < 4) return false;
    if (errorPlan.type === "time") {
      if (errorPlan.times.length === 0) return false;
      return performance.now() - startedAt >= errorPlan.times[0] && performance.now() - lastErrorAt > 400;
    }
    if (!errorPlan.indices.has(wordIndex)) return false;
    let index = errorPlan.charIndex.get(wordIndex);
    if (index === undefined) {
      if (text.length < 2) {
        errorPlan.indices.delete(wordIndex);
        return false;
      }
      index = 1 + Math.floor(Math.random() * (text.length - 1));
      errorPlan.charIndex.set(wordIndex, index);
    }
    return charIndex === index;
  }

  function wrongChar(ch) {
    const pool = "abcdefghijklmnopqrstuvwxyz";
    let wrong = pool[Math.floor(Math.random() * pool.length)];
    if (wrong === ch.toLowerCase()) wrong = wrong === "a" ? "b" : "a";
    if (ch >= "A" && ch <= "Z") wrong = wrong.toUpperCase();
    return wrong;
  }

  async function makeMistake(ch, wordIndex, charIndex, id) {
    if (!errorPlan || !correctionAllowed()) return false;
    if (!running || id !== runId) throw new StopError();
    if (isTestOver()) return false;

    await typeCharSafe(wrongChar(ch), id);
    const ok = await waitForPosition(wordIndex, charIndex + 1, 260);
    if (!ok) return false;

    await sleep(randomBetween(90, 220));
    if (!running || id !== runId) throw new StopError();
    if (isTestOver()) return false;

    synthBackspace();
    const wentBack = await waitForUntyped(wordIndex, charIndex, 420);
    if (!wentBack) throw new Error("error correction blocked");

    errorsMade++;
    lastErrorAt = performance.now();
    if (errorPlan.type === "time") errorPlan.times.shift();
    else {
      errorPlan.indices.delete(wordIndex);
      errorPlan.charIndex.delete(wordIndex);
    }
    await sleep(randomBetween(35, 80));
    return true;
  }

  async function startTyping() {
    if (running) return;

    monkeyConfig = readMonkeyConfig();
    const id = ++runId;
    running = true;
    lastTyped = "";
    paceFactor = 1;
    currentTargetWpm = 0;
    wpmChangeAt = 0;
    errorsMade = 0;
    lastErrorAt = 0;
    setButtons(true);
    setStatus("waiting", "waiting for test");

    try {
      await waitForTestReady(id);

      if (!running || id !== runId) return;

      const input = document.querySelector("#wordsInput");
      if (!input) throw new Error("words input not found");

      input.focus({ preventScroll: true });
      try {
        input.setSelectionRange(input.value.length, input.value.length);
      } catch {
        // ignore selection errors
      }
      await sleep(120);

      if (document.activeElement !== input) {
        input.focus({ preventScroll: true });
        await sleep(50);
      }
      if (document.activeElement !== input) {
        throw new Error("click the page, then press F8");
      }
      if (isTestAlreadyStarted()) {
        throw new Error("restart the test first (Tab)");
      }

      errorPlan = correctionAllowed() ? buildErrorPlan() : null;

      if (!running || id !== runId) return;
      setStatus("typing", "typing · synth");

      await runTyping(id);

      if (id === runId) {
        running = false;
        setStatus("done", "done");
      }
    } catch (error) {
      if (error instanceof StopError) return;
      if (id === runId) {
        running = false;
        const text = error && error.message ? error.message : "error";
        setStatus("error", text.length > 46 ? text.slice(0, 46) + "…" : text);
      }
    } finally {
      if (id === runId) {
        running = false;
        setButtons(false);
      }
    }
  }

  function stopTyping(label) {
    if (!running) return;
    running = false;
    runId++;
    setButtons(false);
    setStatus(label || "stopped", label || "stopped");
  }

  async function waitForTestReady(id) {
    const deadline = performance.now() + 15000;
    while (running && id === runId && performance.now() < deadline) {
      const typing = document.querySelector("#typingTest");
      const input = document.querySelector("#wordsInput");
      const word = document.querySelector("#words .word");
      if (typing && input && word && !isTestOver() && !isCountdownVisible()) {
        const style = getComputedStyle(typing);
        const opacity = parseFloat(style.opacity || "1");
        if (style.display !== "none" && style.visibility !== "hidden" && opacity >= 0.9) {
          return;
        }
      }
      await sleep(50);
    }
    if (!running || id !== runId) throw new StopError();
    throw new Error("test did not become ready");
  }

  function isCountdownVisible() {
    const elements = document.querySelectorAll("#countdown, .countdown, [data-countdown]");
    for (const element of elements) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (parseFloat(style.opacity || "1") < 0.05) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return true;
    }
    return false;
  }

  function isTestAlreadyStarted() {
    if (document.querySelector("#words .word.typed")) return true;
    if (document.querySelector("#words letter.correct, #words letter.incorrect, #words letter.extra")) {
      return true;
    }
    const active = document.querySelector("#words .word.active");
    if (active) {
      const index = parseInt(active.dataset.wordindex || "", 10);
      if (Number.isFinite(index) && index > 0) return true;
    }
    return false;
  }

  function isTestOver() {
    const typing = document.querySelector("#typingTest");
    if (!typing) return true;
    if (typing.classList.contains("hidden")) return true;
    const style = getComputedStyle(typing);
    if (style.display === "none" || style.visibility === "hidden") return true;
    if (parseFloat(style.opacity || "1") < 0.05) return true;
    if (!document.querySelector("#words .word")) return true;
    return false;
  }

  async function waitForTestEnd(timeout) {
    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      if (isTestOver()) return true;
      await sleep(20);
    }
    return false;
  }

  function isFiniteTest() {
    const mode = (monkeyConfig.mode || "").toLowerCase();
    if (mode === "time") return false;
    if (mode === "custom") {
      return readCustomLimitMode() !== "time";
    }
    return true;
  }

  function isLastRenderedWord(wordIndex) {
    const words = document.querySelectorAll("#words .word");
    if (words.length === 0) return false;
    const last = words[words.length - 1];
    return parseInt(last.dataset.wordindex || "", 10) === wordIndex;
  }

  async function runTyping(id) {
    if ((monkeyConfig.mode || "").toLowerCase() === "zen") {
      await runZen(id);
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let typedCount = 0;
    let typingStartedAt = 0;
    const wordCache = new Map();
    lastTyped = "";

    if (!(await waitForActiveWord(0, 3000))) {
      throw new Error("active word not found");
    }

    while (running && id === runId) {
      if (isTestOver()) return;

      const text = await getWordTextCached(wordIndex, wordCache, 5000);
      if (text === null) {
        if (isTestOver()) return;
        throw new Error(`word ${wordIndex + 1} not found`);
      }

      if (charIndex < text.length) {
        const ch = text[charIndex];
        await pace(ch, id);
        if (!running || id !== runId) throw new StopError();
        if (isTestOver()) return;

        const before = { wordIndex, charIndex };
        const expected = expectedPosition(text, wordIndex, charIndex);

        if (shouldMakeMistake(wordIndex, charIndex, ch, text, typedCount, typingStartedAt)) {
          await makeMistake(ch, wordIndex, charIndex, id);
          if (!running || id !== runId) throw new StopError();
          if (isTestOver()) return;
        }

        if (typedCount === 0) typingStartedAt = performance.now();
        await typeCharSafe(ch, id);

        let ok = await waitForPosition(
          expected.wordIndex,
          expected.charIndex,
          ch === " " ? 320 : 140
        );

        if (!ok) {
          if (isTestOver()) return;
          const pos = getTypedPosition();
          if (pos && !samePosition(pos, before)) {
            wordIndex = pos.wordIndex;
            charIndex = pos.charIndex;
            lastTyped = "";
            continue;
          }

          const retried = await retryTyping(ch, expected, id);
          if (!retried) {
            const after = getTypedPosition();
            if (after && !samePosition(after, before)) {
              wordIndex = after.wordIndex;
              charIndex = after.charIndex;
              lastTyped = "";
              continue;
            }
            throw new Error("input not registering");
          }
          ok = true;
        }

        if (
          ok &&
          ch !== " " &&
          ch !== "\n" &&
          ch !== "\t" &&
          settings.fixErrors
        ) {
          if (isTestOver()) return;
          if (getLetterStatus(wordIndex, charIndex) === "incorrect") {
            if (correctionAllowed()) {
              await correctLetter(wordIndex, charIndex, ch, id);
            } else if ((monkeyConfig.confidenceMode || "off") === "max") {
              throw new Error("backspace disabled (confidence max)");
            }
          }
        }

        lastTyped = ch;
        typedCount++;
        noteTyped(typedCount, typingStartedAt);
        charIndex++;
        continue;
      }

      if (isTestOver()) return;

      if (text.endsWith("\n")) {
        wordIndex++;
        charIndex = 0;
        lastTyped = "";
        if (!(await waitForActiveWord(wordIndex, 5000))) {
          if (isTestOver()) return;
          throw new Error("next word did not appear");
        }
        continue;
      }

      if (isFiniteTest() && isLastRenderedWord(wordIndex)) {
        if (await waitForTestEnd(650)) return;
      }

      await pace(" ", id);
      if (!running || id !== runId) throw new StopError();
      if (isTestOver()) return;

      const beforeSpace = { wordIndex, charIndex: text.length };
      if (typedCount === 0) typingStartedAt = performance.now();
      await typeCharSafe(" ", id);

      let spaceOk = await waitForPosition(wordIndex + 1, 0, 380);
      if (!spaceOk) {
        if (isTestOver()) return;
        const pos = getTypedPosition();
        if (pos && !samePosition(pos, beforeSpace)) {
          wordIndex = pos.wordIndex;
          charIndex = pos.charIndex;
          lastTyped = "";
          continue;
        }
        if (await waitForTestEnd(500)) return;
        const retried = await retryTyping(" ", { wordIndex: wordIndex + 1, charIndex: 0 }, id);
        if (!retried) {
          const after = getTypedPosition();
          if (after && !samePosition(after, beforeSpace)) {
            wordIndex = after.wordIndex;
            charIndex = after.charIndex;
            lastTyped = "";
            continue;
          }
          if (await waitForTestEnd(400)) return;
          throw new Error("space not registering");
        }
      }

      lastTyped = " ";
      typedCount++;
      noteTyped(typedCount, typingStartedAt);
      wordIndex++;
      charIndex = 0;

      if (!(await waitForActiveWord(wordIndex, 5000))) {
        if (isTestOver()) return;
        throw new Error("next word did not appear");
      }
    }

    throw new StopError();
  }

  async function runZen(id) {
    lastTyped = "";
    for (let i = 0; i < ZEN_TEXT.length; i++) {
      if (!running || id !== runId) throw new StopError();
      if (isTestOver()) return;

      const ch = ZEN_TEXT[i];
      await pace(ch, id);
      if (!running || id !== runId) throw new StopError();
      if (isTestOver()) return;

      synthInsert(ch);
      lastTyped = ch;

      if (i > 0 && i % 12 === 0) {
        await sleep(12);
      }
    }

    if (!running || id !== runId) throw new StopError();

    synthShiftEnter();

    const deadline = performance.now() + 4000;
    while (performance.now() < deadline && running && id === runId) {
      if (isTestOver()) return;
      await sleep(60);
    }
  }

  function noteTyped(count, startedAt) {
    if (count < 20 || count % 20 !== 0) return;
    const elapsed = performance.now() - startedAt;
    if (elapsed <= 600) return;
    const actual = count / 5 / (elapsed / 60000);
    const target = targetWpmNow();
    paceFactor = clamp(paceFactor * clamp(actual / target, 0.8, 1.2), 0.3, 2.5);
    setStatus("typing", `typing · synth · ~${Math.round(actual)} wpm`);
  }

  async function pace(nextChar, id) {
    const wpm = targetWpmNow();
    const jitter = clamp(Number(settings.jitter) || 0, 0, 50) / 100;
    const base =
      Math.max(4, 60000 / (wpm * 5) - (wpm >= 200 ? 6 : 0)) * paceFactor;

    let delay = base * (1 + (Math.random() * 2 - 1) * jitter);

    if (wpm < 200) {
      if (lastTyped === "") {
        delay += randomBetween(140, 280);
      } else if (lastTyped === " ") {
        delay += randomBetween(30, 120);
      } else if (/[.,!?;:]/.test(lastTyped)) {
        delay += randomBetween(80, 200);
      } else if (/[—–]/.test(lastTyped)) {
        delay += randomBetween(40, 100);
      }
    }

    const target = performance.now() + delay;
    while (running && id === runId) {
      const remaining = target - performance.now();
      if (remaining <= 0) break;
      await sleep(Math.min(remaining, 40));
    }

    if (!running || id !== runId) throw new StopError();
    if (nextChar === undefined) return;
  }

  async function typeCharSafe(ch, id) {
    if (!running || id !== runId) throw new StopError();
    synthInsert(ch);
  }

  async function retryTyping(ch, expected, id) {
    if (!running || id !== runId) throw new StopError();
    try {
      synthInsert(ch);
    } catch {
      return false;
    }
    return await waitForPosition(expected.wordIndex, expected.charIndex, 180);
  }

  async function correctLetter(wordIndex, charIndex, ch, id) {
    if (!running || id !== runId) throw new StopError();
    if (isTestOver()) return;

    synthBackspace();

    if (isTestOver()) return;

    const wentBack = await waitForUntyped(wordIndex, charIndex, 320);
    if (!wentBack) throw new Error("backspace blocked");

    await sleep(randomBetween(35, 80));
    if (!running || id !== runId) throw new StopError();
    if (isTestOver()) return;

    synthInsert(ch);
    const ok = await waitForPosition(wordIndex, charIndex + 1, 220);
    if (!ok) throw new Error("correction failed");
    if (getLetterStatus(wordIndex, charIndex) === "incorrect") {
      throw new Error("correction failed");
    }
  }

  function expectedPosition(text, wordIndex, charIndex) {
    const ch = text[charIndex];
    if (ch === " " || (ch === "\n" && charIndex === text.length - 1)) {
      return { wordIndex: wordIndex + 1, charIndex: 0 };
    }
    return { wordIndex, charIndex: charIndex + 1 };
  }

  function samePosition(a, b) {
    return a.wordIndex === b.wordIndex && a.charIndex === b.charIndex;
  }

  function getTypedPosition() {
    const active = document.querySelector("#words .word.active");
    if (!active) return null;
    const wordIndex = parseInt(active.dataset.wordindex || "", 10);
    if (!Number.isFinite(wordIndex)) return null;

    let typed = 0;
    for (const letter of active.querySelectorAll("letter")) {
      if (letter.classList.contains("extra")) {
        typed++;
      } else if (
        letter.classList.contains("correct") ||
        letter.classList.contains("incorrect")
      ) {
        typed++;
      }
    }
    return { wordIndex, charIndex: typed };
  }

  function getLetterStatus(wordIndex, letterIndex) {
    const word = document.querySelector(`#words .word[data-wordindex="${wordIndex}"]`);
    if (!word) return "missing";
    const letters = word.querySelectorAll("letter");
    const letter = letters[letterIndex];
    if (!letter) return "missing";
    if (letter.classList.contains("incorrect")) return "incorrect";
    if (letter.classList.contains("correct")) return "correct";
    return "untyped";
  }

  async function waitForPosition(wordIndex, charIndex, timeout) {
    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      if (isTestOver()) return true;
      const pos = getTypedPosition();
      if (pos && pos.wordIndex === wordIndex && pos.charIndex === charIndex) return true;
      await sleep(8);
    }
    return false;
  }

  async function waitForUntyped(wordIndex, charIndex, timeout) {
    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      const status = getLetterStatus(wordIndex, charIndex);
      const pos = getTypedPosition();
      if (status === "untyped" && pos && pos.wordIndex === wordIndex && pos.charIndex === charIndex) {
        return true;
      }
      if (pos && (pos.wordIndex < wordIndex || (pos.wordIndex === wordIndex && pos.charIndex < charIndex))) {
        return true;
      }
      if (isTestOver()) return true;
      await sleep(10);
    }
    return false;
  }

  async function waitForActiveWord(wordIndex, timeout) {
    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      if (isTestOver()) return false;
      const active = document.querySelector("#words .word.active");
      if (active) {
        const index = parseInt(active.dataset.wordindex || "", 10);
        if (Number.isFinite(index) && index === wordIndex) return true;
      }
      await sleep(10);
    }
    return false;
  }

  async function getWordTextCached(wordIndex, cache, timeout) {
    if (cache.has(wordIndex)) return cache.get(wordIndex);

    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      const text = readWordText(wordIndex);
      if (text !== null) {
        cache.set(wordIndex, text);
        return text;
      }
      if (isTestOver()) return null;
      await sleep(15);
    }
    return null;
  }

  function readWordText(wordIndex) {
    const word = document.querySelector(`#words .word[data-wordindex="${wordIndex}"]`);
    if (!word) return null;

    let text = "";
    for (const letter of word.querySelectorAll("letter")) {
      if (letter.classList.contains("extra")) continue;
      if (letter.classList.contains("nlChar")) {
        text += "\n";
        continue;
      }
      if (letter.classList.contains("tabChar")) {
        text += "\t";
        continue;
      }

      let char = letter.textContent || "";
      if (char === "") {
        const icon = letter.querySelector("i, svg");
        const cls = icon ? icon.getAttribute("class") || "" : "";
        if (cls.includes("arrow-left")) char = "←";
        else if (cls.includes("arrow-right")) char = "→";
        else if (cls.includes("arrow-up")) char = "↑";
        else if (cls.includes("arrow-down")) char = "↓";
        else if (cls.includes("level-down")) char = "\n";
        else if (cls.includes("long-arrow-alt-right")) char = "\t";
      }
      text += char;
    }

    if (!text.endsWith("\n")) {
      const next = word.nextElementSibling;
      if (
        next &&
        (next.classList.contains("beforeNewline") || next.classList.contains("newline"))
      ) {
        text += "\n";
      }
    }

    return text;
  }

  function focusInput() {
    const input = document.querySelector("#wordsInput");
    if (!input) throw new Error("words input not found");
    input.focus({ preventScroll: true });
    try {
      input.setSelectionRange(input.value.length, input.value.length);
    } catch {
      // ignore
    }
    return input;
  }

  function synthInsert(ch) {
    const input = focusInput();
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, ch);
    } catch {
      inserted = false;
    }

    if (!inserted) {
      const before = input.value;
      input.value = before + ch;
      try {
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: ch,
          })
        );
      } catch {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function synthBackspace() {
    const input = focusInput();
    let deleted = false;
    try {
      deleted = document.execCommand("delete");
    } catch {
      deleted = false;
    }

    if (!deleted) {
      const before = input.value;
      if (before.length > 0) {
        input.value = before.slice(0, -1);
        try {
          input.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              inputType: "deleteContentBackward",
              data: null,
            })
          );
        } catch {
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    }
  }

  function synthShiftEnter() {
    const input = focusInput();
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
  }
})();
