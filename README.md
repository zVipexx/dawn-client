<div align="center">

<img src="https://i.imgur.com/PY7bWUX.png" width="120" height="120" alt="Dawn Client Logo" />

<br />

# Dawn Client

### An unofficial, feature-rich Electron client for Kirka.io

<br />

[![Discord](https://img.shields.io/discord/VsMEQ3HWs2?color=5865F2&label=Discord&logo=discord&logoColor=white&style=for-the-badge)](https://discord.gg/VsMEQ3HWs2)
[![GitHub Releases](https://img.shields.io/github/v/release/zVipexx/dawn-client?color=0f0f0f&label=Latest&logo=github&logoColor=white&style=for-the-badge)](https://github.com/zVipexx/dawn-client/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/zVipexx/dawn-client/releases)

<br />

[**Download**](#download) • [**Features**](#features) • [**Hotkeys**](#hotkeys) • [**Safety**](#is-it-safe) • [**Credits**](#credits)

---

</div>

## Download

Head to the [**Releases**](https://github.com/zVipexx/dawn-client/releases) page to grab the latest installer for Windows, macOS, or Linux.
 
### Or build it yourself
 
Make sure you have [Node.js](https://nodejs.org) and [Git](https://git-scm.com) installed, then run:
 
```bash
# Clone the repository
git clone https://github.com/zVipexx/dawn-client.git
cd dawn-client
 
# Install dependencies
npm install
 
# Start the client
npm run start
```
 
To package a build for your platform:
 
```bash
npm run build
```
 
The output will be in the `build/` folder.

---

## Features

<details open>
<summary><strong>🎨 Visuals & Rendering</strong></summary>

<br />

- **Uncapped FPS** - remove the frame rate cap
- **Wireframe Weapon** - render your weapon (and optionally arms) in wireframe
- **Custom CSS** - inject stylesheets via URL or local file path, with a toggle
- **UI Animations Toggle** - enable or disable interface transitions
- **Interface Opacity & Bounds** - fine-tune UI transparency and positioning
- **Colored Kill Feed** - kills colored by team for quick readability

</details>

<br />

<details open>
<summary><strong>🔫 Weapon Customization</strong></summary>

<br />

- **Weapon Color** - tint your weapon a custom color, or enable Rainbow mode
- **Weapon Size** - scale your weapon model up or down
- **Weapon Offset** - fine-tune X/Y/Z position of your weapon in view
- **Skin Changer** - apply custom skins to any weapon (client-side only)
- **Permanent Crosshair** - always-visible crosshair, no fading when scoping

</details>

<br />

<details open>
<summary><strong>🔧 HUD & Interface</strong></summary>

<br />

- **Custom Hitmarker** - set via URL or local file path
- **Custom Kill Icon** - set via URL or local file path
- **K/D Indicator** - live kill/death ratio displayed in HUD
- **Hide Chat / Hide Interface** - declutter or go fully immersive
- **Permanent Tablist** - keep the scoreboard always visible
- **Spectate Button** - quick-spectate friends directly from the friends list
- **Skip Loading Screen** 

</details>

<br />

<details open>
<summary><strong>🎭 Personalization</strong></summary>

<br />

- **Local Customizations** - create your own gradient name, badges, and profile background visible only to you
  - Animated gradients with configurable rotation, shadow color & intensity
  - Add/remove custom badge slots
  - Custom profile background via URL
- **Sound Swapper** - replace any in-game sound (hitmarker, gunshots, kills, etc.) with your own `.mp3`
- **Custom Menu Themes** - Dark, Light, Dawn, or Glass
- **Custom Menu Keybind** - set any key to open/close the menu

</details>

<br />

<details open>
<summary><strong>🌐 Browse & Community</strong></summary>

<br />

- **Community Hub** - browse and apply community-made CSS packs, crosshairs, skyboxes, map textures, kill icons, sounds, and maps directly in the client
- **Map Images in Server List** - visual map previews when browsing servers
- **Custom List Price** - set your own default listing price
- **Shift-click username** in Global Chat to open their profile
- **Shift-click link** in Friends List to copy the game link

</details>

<br />

<details open>
<summary><strong>🛠️ Client Tools</strong></summary>

<br />

- **Userscripts** - run custom JS scripts inside the client
- **Discord Rich Presence** - show your Kirka status on Discord
- **Pack / Chest Auto Opener** - unbox while playing
- **Proxy URL** - choose from multiple proxies

</details>

<br />

---

## Hotkeys

| Key | Action |
|-----|--------|
| `F2` | Screenshot and copy to clipboard |
| `F4` | Return to `https://kirka.io` |
| `F5` | Reload |
| `F6` | Load URL |
| `F7` | Copy URL |
| `F11` | Toggle Fullscreen |
| `F12` / `Ctrl+Shift+I` | Open DevTools |
| `Shift + Click` name in chat | Open player profile |
| `Shift + Click` link in friends list | Copy game link |

---

## Is it Safe?

**Yes.** Dawn Client is 100% safe to use. All releases are built directly using github workflows.

If you run into any issues, join the [Discord server](https://discord.gg/VsMEQ3HWs2) to report bugs or get support from the community.

---

## Credits

| Contributor | Contribution |
|-------------|--------------|
| **[Kirka Community Hub](https://kirkacommunityhub.pages.dev)** | Browser Assets |
| **irrvlo** | Original Juice Client & Kirka Tools |
| **Daymian** | Maps and additional CSS |
| **CarrySheriff** | Original Pack/Chest opener, Map Images, Market Names, Custom List Price |
| **Cheeseburger** | Updated Pack/Chest opener |
| **AwesomeSam** | Basic Resource Swapper |
| **Error430** | Performance optimizations |
| **robertpakalns** | Bug fixes, optimizations & tweaks |

---

<div align="center">

<sub>Built with ❤️ for the Kirka.io community &nbsp;•&nbsp; <a href="https://discord.gg/VsMEQ3HWs2">Join the Discord</a></sub>

</div>
