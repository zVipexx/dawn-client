// ==UserScript==
// @name         Custom Skin Link
// @description  Allows you to easily change the skin link
// @version      3
// @author       SheriffCarry
// @github       https://api.github.com/repos/SheriffCarry/KirkaScripts/contents/Userscript/Custom%20Skin%20Link.js
// ==/UserScript==

//Runs on the original BKC custom skin link feature (made by infi and boden)
let localStoragekey1 =
  "SETTINGS___SETTING/PLAYERS___SETTING/RENDER_TEXTURE___SETTING";
let localStoragekey2 =
  "SETTINGS___SETTING/PLAYERS___SETTING/RENDER_COLOR___SETTING";

//HTML stuff
let option_group = document.createElement("div");
option_group.className = "option-group";
let option = document.createElement("div");
option.className = "option";
let canvas = document.createElement("canvas");
canvas.id = "canvas_colorpicker";
let colorpicker_head_label = document.createElement("label");
colorpicker_head_label.setAttribute("for", "colorpicker_head");
colorpicker_head_label.innerHTML = "Head color";
let colorpicker_head = document.createElement("input");
colorpicker_head.type = "color";
colorpicker_head.id = "colorpicker_head";
//colorpicker_head.value = "#ff00ff";
let colorpicker_body_label = document.createElement("label");
colorpicker_body_label.setAttribute("for", "colorpicker_body");
colorpicker_body_label.innerHTML = "body color";
let colorpicker_body = document.createElement("input");
colorpicker_body.type = "color";
colorpicker_body.id = "colorpicker_body";
let colorpicker_output = document.createElement("input");
colorpicker_output.type = "text";
colorpicker_output.id = "colorpicker_output";
colorpicker_output.readOnly = true;
let csl_enabled = document.createElement("div");
csl_enabled.className = "option";
csl_enabled.innerHTML =
  '<div class="left"><span>Enabled</span></div><div class="checkbox"><input type="checkbox" id="csl_enabled"><label for="csl_enabled"></label></div>';
let csl_ingame_only = document.createElement("div");
csl_ingame_only.className = "option";
csl_ingame_only.innerHTML =
  '<div class="left"><span>Only swap ingame</span></div><div class="checkbox"><input type="checkbox" id="csl_ingame_only"><label for="csl_ingame_only"></label></div>';
let output_container = document.createElement("div");
output_container.className = "option";
let csl_url_or_base64 = document.createElement("div");
csl_url_or_base64.className = "checkbox";
csl_url_or_base64.innerHTML =
  '<div class="checkbox"><input type="checkbox" id="csl_url_or_base64"><label for="csl_url_or_base64"></label></div>';
let csl_colorpicker_inputurl = document.createElement("input");
csl_colorpicker_inputurl.type = "text";
csl_colorpicker_inputurl.id = "csl_colorpicker_inputurl";
csl_colorpicker_inputurl.placeholder = "Insert custom url here";
let tooltip_container = document.createElement("div");
tooltip_container.className = "tooltip-container-csl";
let tooltip_icon = document.createElement("span");
tooltip_icon.className = "info-icon-csl";
tooltip_icon.innerHTML = "i";
let option_inputfield_description = document.createElement("div");
option_inputfield_description.className = "option";
let description_left = document.createElement("div");
description_left.className = "left";
description_left.innerHTML = "Skin from Imagebuilder";
let description_right = document.createElement("div");
description_right.className = "right";
description_right.innerHTML = "Skin from your input";
let tooltip_text = document.createElement("div");
tooltip_text.className = "tooltip-text-csl";
tooltip_text.innerText = `Made by SheriffCarry\nRuns on the original BKC custom skin link\n feature (made by infi and boden)`;
let style = document.createElement("style");
style.innerHTML = `
/* Tooltip container */
.tooltip-container-csl {
    position: relative;
    display: inline-block;
    cursor: pointer;
    font-size: 14px;
}

/* Tooltip icon */
.info-icon-csl {
    background-color: #444;
    color: white;
    border-radius: 50%;
    padding: 5px;
    width: 20px;
    height: 20px;
    text-align: center;
    display: inline-block;
    font-weight: bold;
    line-height: 20px;
}

/* Tooltip text (hidden by default) */
.tooltip-text-csl {
    visibility: hidden;
    width: 400px;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 5px;
    padding: 10px;
    position: absolute;
    z-index: 1;
    bottom: 125%; /* Adjust this to position above the icon */
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
    white-space: nowrap;
}

/* Tooltip arrow */
.tooltip-text-csl::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
}

/* Show the tooltip when hovering over the info icon */
.info-icon-csl:hover + .tooltip-text-csl {
    visibility: visible;
    opacity: 1;
}

.highlight_textarea {
border-color: #ffa500 !important;
}
input[type="text"]::placeholder {
color: #999 !important;
transition: color 0.3s ease !important;
}
input[type="text"]:hover::placeholder {
color: #555 !important;
}
`;
option.appendChild(canvas);
option.appendChild(colorpicker_head_label);
option.appendChild(colorpicker_head);
option.appendChild(colorpicker_body_label);
option.appendChild(colorpicker_body);
tooltip_container.appendChild(tooltip_icon);
tooltip_container.appendChild(tooltip_text);
option_group.appendChild(style);
option_group.appendChild(tooltip_container);
option_group.appendChild(csl_enabled);
option_group.appendChild(csl_ingame_only);
option_group.appendChild(option);
output_container.appendChild(colorpicker_output);
output_container.appendChild(csl_url_or_base64);
output_container.appendChild(csl_colorpicker_inputurl);
option_inputfield_description.appendChild(description_left);
option_inputfield_description.appendChild(description_right);
option_group.appendChild(option_inputfield_description);
option_group.appendChild(output_container);
let default_url =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAANJJREFUeF7t2EEKBDEIBdF4/0M7MAeIi0HmQ15v022LaJWkTp8+l6frenz79HtWXeM7//x/KYAOMAIY8E8ITYTchjAIPm+BPv2b6KceDj8vBdABRgADwjm1mh4IPm+BaRFa7b+A4OMqHJDjagoKYASGG6HV/gsIbgSMgBG4X4oGjOlqChiAARiAAW9fiGAABmAABqyuWuHBbYIswAIswALhoF5NjwVYgAVYgAVWMRsenAVYgAVYgAXCQb2aHguwAAuwAAusYjY8OAuwAAuwwNMW+AByY7e5Jy8jiwAAAABJRU5ErkJggg==";
let change_event = new Event("change", { bubbles: true });
const pixelData = [];
let d_colorpicker_output;
let d_csl_enabled;
let d_canvas_colorpicker;
let d_colorpicker_head;
let d_colorpicker_body;
let canvas_loaded = false;
function fixLocalStorage() {
  if (!localStorage[localStoragekey1]) {
    localStorage[localStoragekey1] = "1";
  }
  if (localStorage[localStoragekey1] != "1") {
    localStorage[localStoragekey1] = "1";
  }
  if (!localStorage[localStoragekey2]) {
    localStorage[localStoragekey2] = "#ffffff";
  }
  if (localStorage[localStoragekey2] != "#ffffff") {
    localStorage[localStoragekey2] = "#ffffff";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setTimeout(() => {
    startfunction();
  }, 1000);
});

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image")) {
      throw new Error("URL does not point to an image");
    }

    const blob = await response.blob();
    const base64String = await blobToBase64(blob);
    return base64String;
  } catch (error) {
    console.error("Error fetching or converting image: ", error);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function displayStartingCanvas(img_display) {
  let canvas = d_canvas_colorpicker;
  let ctx = canvas.getContext("2d");
  canvas.width = img_display.width;
  canvas.height = img_display.height;

  //canvas draw
  ctx.drawImage(img_display, 0, 0);
}

function displayNewImage(src) {
  let canvas = d_canvas_colorpicker;
  let ctx = canvas.getContext("2d");
  canvas.width = img_display.width;
  canvas.height = img_display.height;

  //canvas draw
  ctx.drawImage(img_display, 0, 0);
}

function handleHighlight() {
  if (localStorage.csl_url_or_base64 == "true") {
    document.getElementById("colorpicker_output").className = "";
    document.getElementById("csl_colorpicker_inputurl").className =
      "highlight_textarea";
  } else {
    document.getElementById("colorpicker_output").className =
      "highlight_textarea";
    document.getElementById("csl_colorpicker_inputurl").className = "";
  }
}

function startfunction() {
  //Checks if the script-options are loaded in to ensure it can add stuff in the right menu
  if (document.getElementById("scripts-options")) {
    document.getElementById("scripts-options").appendChild(option_group);
    handleHighlight();
    let csl_url_or_base64 = document.getElementById("csl_url_or_base64");
    if (localStorage.csl_url_or_base64 == undefined) {
      localStorage.csl_url_or_base64 = false;
    }
    if (localStorage.csl_url_or_base64 == "true") {
      csl_url_or_base64.checked = true;
      handleHighlight();
    }
    csl_url_or_base64.addEventListener("change", function (event) {
      let value = csl_url_or_base64.checked;
      if (localStorage.csl_url_or_base64 == undefined) {
        localStorage.csl_url_or_base64 = value;
      } else if (localStorage.csl_url_or_base64 != value) {
        localStorage.csl_url_or_base64 = value;
      }
      handleHighlight();
    });
    let csl_colorpicker_inputurl = document.getElementById(
      "csl_colorpicker_inputurl",
    );
    if (localStorage.csl_colorpicker_inputurl != undefined) {
      csl_colorpicker_inputurl.value = localStorage.csl_colorpicker_inputurl;
    }
    csl_colorpicker_inputurl.addEventListener("change", function (event) {
      localStorage.csl_colorpicker_inputurl = csl_colorpicker_inputurl.value;
      fetchImageAsBase64(csl_colorpicker_inputurl.value).then((base64Image) => {
        if (typeof base64Image == "string") {
          csl_colorpicker_inputurl.value = base64Image;
          localStorage.csl_colorpicker_inputurl = base64Image;
        }
      });
    });
    d_colorpicker_output = document.getElementById("colorpicker_output");
    d_csl_enabled = document.getElementById("csl_enabled");
    d_canvas_colorpicker = document.getElementById("canvas_colorpicker");
    d_colorpicker_head = document.getElementById("colorpicker_head");
    d_colorpicker_body = document.getElementById("colorpicker_body");
    if (localStorage.csl_head != undefined) {
      d_colorpicker_head.value = localStorage.csl_head;
    } else {
      d_colorpicker_head.value = "#ff00ff";
    }
    if (localStorage.csl_body != undefined) {
      d_colorpicker_body.value = localStorage.csl_body;
    } else {
      d_colorpicker_body.value = "#00ff00";
    }

    d_colorpicker_output.addEventListener("change", function (event) {
      let value = d_colorpicker_output.value;
      if (localStorage.csl_url == undefined) {
        localStorage.csl_url = value;
        let img = new Image();
        img.src = value;
        img.onload = function () {
          displayStartingCanvas(img);
        };
      } else if (localStorage.csl_url != value) {
        localStorage.csl_url = value;
        let img = new Image();
        img.src = value;
        img.onload = function () {
          displayStartingCanvas(img);
        };
      }
    });
    if (localStorage.csl_enabled == "true") {
      d_csl_enabled.checked = true;
      fixLocalStorage();
    }
    d_csl_enabled.addEventListener("change", function (event) {
      localStorage.csl_enabled = d_csl_enabled.checked;
      if (localStorage.csl_enabled == "true") {
        fixLocalStorage();
      }
    });
    let d_csl_ingame_only = document.getElementById("csl_ingame_only");
    if (localStorage.csl_ingame_only == undefined) {
      localStorage.csl_ingame_only = "true";
    }
    if (localStorage.csl_ingame_only == "true") {
      d_csl_ingame_only.checked = true;
    }
    d_csl_ingame_only.addEventListener("change", function (event) {
      localStorage.csl_ingame_only = d_csl_ingame_only.checked;
    });

    let img_display = new Image();
    let img = new Image();
    img.src = default_url;
    if (localStorage.csl_url == undefined) {
      d_colorpicker_output.value = default_url;
      d_colorpicker_output.dispatchEvent(change_event);
      img_display.src = default_url;
    } else {
      d_colorpicker_output.value = localStorage.csl_url;
      d_colorpicker_output.dispatchEvent(change_event);
      img_display.src = localStorage.csl_url;
    }

    //modifyable image
    img.onload = function () {
      const canvas = d_canvas_colorpicker;
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;

      //canvas draw
      ctx.drawImage(img, 0, 0);

      //collects pixel information
      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let pixels = imgData.data;

      //stores pixel in an array of objects [{x, y, r, g, b, a}]
      for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];
        let a = pixels[i + 3];

        //x and y coords
        let x = (i / 4) % canvas.width;
        let y = Math.floor(i / 4 / canvas.width);

        //storing
        pixelData.push({ x, y, r, g, b, a });
      }

      //event listener
      d_colorpicker_head.addEventListener("input", updateTexture);
      d_colorpicker_body.addEventListener("input", updateTexture);
      displayStartingCanvas(img_display);
    };

    //display last used image
    img_display.onload = function () {
      displayStartingCanvas(img_display);
    };
  }
}

//big chungis function
function updateTexture() {
  localStorage.csl_body = d_colorpicker_body.value;
  localStorage.csl_head = d_colorpicker_head.value;
  let canvas = d_canvas_colorpicker;
  let ctx = canvas.getContext("2d");
  let headColor = hexToRgb(d_colorpicker_head.value);
  let bodyColor = hexToRgb(d_colorpicker_body.value);

  let pixelData2 = [];

  //makes the new pixel objects
  for (let i = 0; i < pixelData.length; i++) {
    let pixel = {};
    pixel.a = pixelData[i].a;
    pixel.x = pixelData[i].x;
    pixel.y = pixelData[i].y;

    if (pixelData[i].g === 255) {
      //body color
      pixel.r = bodyColor.r;
      pixel.g = bodyColor.g;
      pixel.b = bodyColor.b;
    } else {
      //head color
      pixel.r = headColor.r;
      pixel.g = headColor.g;
      pixel.b = headColor.b;
    }
    pixelData2.push(pixel);
  }

  //data holder for new image data
  let newImageData = ctx.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < pixelData2.length; i++) {
    let pixel = pixelData2[i];
    let index = (pixel.y * canvas.width + pixel.x) * 4;

    //modifies the image with pixel details
    newImageData.data[index] = pixel.r;
    newImageData.data[index + 1] = pixel.g;
    newImageData.data[index + 2] = pixel.b;
    newImageData.data[index + 3] = pixel.a;
  }

  //makes the image on the canvas
  ctx.putImageData(newImageData, 0, 0);

  //output
  let output = canvas.toDataURL();
  d_colorpicker_output.value = output;
  //to ensure that the triggers a change event
  d_colorpicker_output.dispatchEvent(change_event);
}

// the function tells what it does smh
//made this function with chatgpt (thanks to the guy that provided it that data)
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

//Skywalks improved version:
const oldIsArr = Array.isArray;
const muzzleImg = "https://kirka.io/assets/img/__shooting-fire__.effa20af.png";
const muzzleImg2 = "shooting-fire";

let patchedTextures = new Map();

function getCurrentSkinUrl() {
  if (localStorage.csl_enabled !== "true") return null;
  let useurl;
  if (localStorage.csl_url_or_base64 === "true") {
    useurl = localStorage.csl_colorpicker_inputurl;
  } else {
    useurl = localStorage.csl_url;
  }
  return useurl || default_url;
}

Array.isArray = function (...args) {
  const arg = args[0];
  if (!arg || !arg.map || !arg.map.image) return oldIsArr.apply(Array, args);

  const texture = arg.map;
  const image = texture.image;
  const width = image.width;
  const height = image.height;

  const customSkinLink = getCurrentSkinUrl();
  const isSkinTexture = (width === 64 || width === 42) &&
    (height === 64 || height === 42 || height === 32);
  const ingame = !!document.querySelector(".desktop-game-interface");
  const ingameOnly = localStorage.csl_ingame_only !== "false";
  const canSwap = ingameOnly ? ingame : true;

  if (isSkinTexture && image.src !== muzzleImg && !image.src.includes(muzzleImg2)) {
    if (canSwap && customSkinLink && !patchedTextures.has(texture)) {
      patchedTextures.set(texture, image.src);
      image.src = customSkinLink;
      texture.needsUpdate = true;
    } else if (!canSwap && patchedTextures.has(texture)) {
      image.src = patchedTextures.get(texture);
      patchedTextures.delete(texture);
      texture.needsUpdate = true;
    }
  }
  return oldIsArr.apply(Array, args);
}