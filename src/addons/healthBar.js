function healthBarAddon(initiallyEnabled) {
  let stop = null;

  const setEnabled = (enabled) => {
    if (enabled && !stop) {
      stop = startHealthBar();
    } else if (!enabled && stop) {
      stop();
      stop = null;
    }
  };

  const onSettingsChanged = ({ detail }) => {
    if (detail.setting === "health_bar_enabled") setEnabled(detail.value);
  };

  document.addEventListener("juice-settings-changed", onSettingsChanged);
  setEnabled(initiallyEnabled);

  return () => {
    document.removeEventListener("juice-settings-changed", onSettingsChanged);
    setEnabled(false);
  };
}

function startHealthBar() {
  const originalWeakMap = window.WeakMap;
  const restorers = [];
  const patchedScenes = new WeakSet();
  const patchedMaterials = new WeakSet();
  let active = true;

  function patch(target, key, replacement) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    target[key] = replacement;
    restorers.push(() => {
      if (target[key] !== replacement) return;
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else delete target[key];
    });
  }

  function isObject3D(object) {
    return object && "id" in object && "name" in object;
  }

  function isScene(object, name) {
    return object.name === name && "WwnMNmWw" in object && "WwWmnN" in object;
  }

  function isMesh(object) {
    return "WwwNWMm" in object;
  }

  function isPlayerMesh(mesh) {
    return mesh.name === "Head";
  }

  function isHealthMaterial(material) {
    const canvas = material?.map?.image;
    return canvas instanceof HTMLCanvasElement && canvas.height !== 1024;
  }

  function confettiPatch(scene) {
    if (patchedScenes.has(scene)) return;
    patchedScenes.add(scene);

    const seen = new Set();
    let playerMesh;

    function traverse(object) {
      if (seen.has(object.id)) return;
      seen.add(object.id);
      if (!isMesh(object)) return;

      if (isPlayerMesh(object)) {
        playerMesh = object;
        return;
      }

      const healthMaterial = object.WwwNWMm;
      if (playerMesh === undefined || !isHealthMaterial(healthMaterial)) return;

      const context = healthMaterial.map.image.getContext("2d");
      if (!context || patchedMaterials.has(playerMesh.WwwNWMm)) return;

      const playerMaterial = playerMesh.WwwNWMm;
      patchedMaterials.add(playerMaterial);
      const radiance = { r: 0, g: 1, b: 0 };
      let uniforms;
      const originalFillRect = context.fillRect;
      const fillRect = function (_x, _y, width) {
        const maxHealth = context.canvas.width;
        const health = maxHealth ? Math.max(0, Math.min(1, width / maxHealth)) : 0;
        radiance.r = 1 - health;
        radiance.g = health;
        if (uniforms !== undefined) uniforms.radiance = { value: radiance };
        return originalFillRect.apply(this, arguments);
      };
      patch(context, "fillRect", fillRect);

      const originalCompile = playerMaterial.wmwWNMn;
      const compile = function (shader) {
        uniforms = shader.WwWnmM;
        uniforms.radiance = { value: radiance };
        shader.wMnmWN = shader.wMnmWN.replace("void main() {", `
uniform vec3 radiance;
void main() {
    gl_FragColor = vec4(radiance, 1.0);
    return;
// ===========
`);
        if (typeof originalCompile === "function") originalCompile.apply(this, arguments);
      };
      patch(playerMaterial, "wmwWNMn", compile);

      const originalProgramKey = playerMaterial.WwnWwN;
      patch(playerMaterial, "WwnWwN", () => playerMaterial.id.toString());
      const originalNeedsUpdate = playerMaterial.wwWMW;
      patch(playerMaterial, "wwWMW", true);
      restorers.push(() => {
        if (playerMaterial.wwWMW === true) playerMaterial.wwWMW = originalNeedsUpdate;
        if (playerMaterial.WwnWwN === playerMaterial.id.toString()) playerMaterial.WwnWwN = originalProgramKey;
      });
    }

    scene.WwWmnN(traverse);

    const sceneAdd = scene.WwnMNmWw;
    if (typeof sceneAdd !== "function") return;
    const addObject = function (object) {
      const result = sceneAdd.apply(this, arguments);
      if (!active || !isMesh(object)) return result;
      try {
        if (isHealthMaterial(object.WwwNWMm)) scene.WwWmnN(traverse);
      } catch { }
      return result;
    };
    patch(scene, "WwnMNmWw", addObject);
  }

  const patchedWeakMap = class extends originalWeakMap {
    #once = false;
    #cache = new Set();

    set(object, value) {
      const result = super.set(object, value);
      if (!active || this.#once || !isObject3D(object) || !isScene(object, "")) return result;
      this.#once = true;
      confettiPatch(object);
      return result;
    }
  };

  patch(window, "WeakMap", patchedWeakMap);

  return () => {
    if (!active) return;
    active = false;
    for (const restore of restorers.reverse()) restore();
    if (window.WeakMap === patchedWeakMap) window.WeakMap = originalWeakMap;
  };
}

module.exports = { healthBarAddon };