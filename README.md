# DSH Desktop

> DeepSeek Harness 桌面客户端 — 蓝色小鲸鱼版

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey)]()

DSH Desktop 是 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) 的 Windows 桌面客户端。以 Electron 壳包裹 `dsh web`，开箱即用，附带一只会卖萌的鲸鱼娘桌面宠物。

---

## 功能特性

### 一站式启动

- 自动管理 `dsh web` 服务（端口 3080）的生命周期
- 自动启动 [PHYSMOL](https://github.com/physmol/physmol) 认知服务（端口 8931）
- 端口检测 — 已有服务运行时智能复用，不会重复启动
- 启动时自动清理渲染缓存，确保加载最新插件

### 桌面宠物 — 鲸鱼娘

- 15 种精灵动画状态：idle、working、celebrate、error、joy、eat、play、drag、walk、sleep、wake、welcome、think、wait、disappointed
- 4 种播放模式：循环 (loop)、眨眼 (blink)、乒乓 (pingpong)、单次 (once)
- 拖拽移动 / 单击玩耍 / 双击打开主界面
- 空闲 60 秒自动入睡，点击唤醒
- 气泡对话：每 45 秒随机说话，主进程可推送消息
- 状态桥协议（端口 7779）：接收 dsh 会话状态实时显示在气泡中

### 系统托盘

- 关闭窗口时最小化到托盘，不退出应用
- 托盘菜单：显示窗口 / 刷新 / 检查更新 / 退出

### 自动更新

- 基于 `electron-updater` + GitHub Releases
- 启动后 3 秒自动检查更新
- 支持手动检查更新（菜单 → 帮助 → 检查更新）
- 下载完成后提示重启安装

---

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 | 运行时 |
| npm | - | 安装全局 dsh |
| DeepSeek Harness | 全局安装 | `npm install -g @deepseek-ai/dsh` |
| Python 3.10 | 可选 | PHYSMOL 服务需要 |
| Windows | 10/11 | 主要目标平台 |

---

## 快速开始

### 1. 安装 DeepSeek Harness

```bash
npm install -g @deepseek-ai/dsh
```

### 2. 克隆并安装

```bash
git clone https://github.com/12wdsj/dsh-desktop.git
cd dsh-desktop
npm install
```

### 3. 开发模式运行

```bash
npm start
```

### 4. 构建安装包

```bash
npm run build
```

构建产物在 `dist/` 目录：

- `DSH-Desktop-Setup-x.x.x.exe` — NSIS 安装包
- `latest.yml` — 自动更新清单

---

## 项目结构

```
dsh-desktop/
├── main.js              # Electron 主进程（服务管理、窗口、托盘、更新）
├── preload.js           # 预加载脚本（安全 IPC 桥接）
├── pet.html             # 桌面宠物渲染进程（精灵动画 + 状态机）
├── package.json
├── assets/
│   ├── icon.ico         # 应用图标（多尺寸）
│   ├── icon.png
│   └── pet/             # 鲸鱼娘精灵图（15 个状态）
│       ├── idle.png
│       ├── working.png
│       ├── celebrate.png
│       ├── sleep.png
│       └── ...
└── dist/                # 构建输出（gitignore）
```

---

## 架构设计

```
┌─────────────────────────────────────────────┐
│              DSH Desktop (Electron)          │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ 主窗口    │    │  宠物窗口 (透明置顶)  │   │
│  │ BrowserView│   │  pet.html            │   │
│  │ :3080     │    │  精灵状态机 + IPC     │   │
│  └─────┬────┘    └──────────┬───────────┘   │
│        │                    │                │
│  ┌─────┴────────────────────┴───────────┐   │
│  │            main.js (主进程)            │   │
│  │  - dsh web 生命周期管理               │   │
│  │  - PHYSMOL 服务管理                   │   │
│  │  - 托盘 + 自动更新                    │   │
│  │  - HookServer (:7779) 状态桥          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐         ┌────┴────┐
    │ dsh web │         │ PHYSMOL │
    │ :3080   │         │ :8931   │
    └─────────┘         └─────────┘
```

---

## 宠物状态桥协议

外部进程可通过 HTTP POST 向 `http://127.0.0.1:7779/bubble` 推送消息，在鲸鱼娘气泡中显示。

**简单文本协议：**

```json
{ "text": "Hello!" }
```

**cc-pet 兼容协议（dsh 会话状态）：**

```json
{ "kind": "user" }
{ "kind": "pre", "tool_name": "Read", "tool_input": { "path": "main.js" } }
{ "kind": "post" }
{ "kind": "stop" }
```

| kind | 气泡显示 |
|------|----------|
| `user` | dsh · 思考中... |
| `pre` | dsh · {tool_name} · {detail}... |
| `post` | dsh · 工具完成 |
| `stop` | dsh · 完成 |

---

## 配置说明

主要配置在 `main.js` 顶部：

| 常量 | 默认值 | 说明 |
|------|--------|------|
| `DSH_PORT` | 3080 | dsh web 服务端口 |
| `PHYSMOL_PORT` | 8931 | PHYSMOL 认知服务端口 |
| `PHYSMOL_DIR` | `D:\AI\PHYSMOL` | PHYSMOL 服务目录 |

---

## 发布流程

1. 修改 `package.json` 中的 `version`
2. 运行 `npm run build`
3. 将 `dist/` 中的 `.exe`、`.blockmap`、`latest.yml` 上传到 GitHub Release（tag `vX.Y.Z`）
4. 客户端会在启动时自动检测并提示更新

---

## 常见问题

**Q: 启动时报"找不到 dsh"**
A: 先安装 `npm install -g @deepseek-ai/dsh`，确认 `D:\nodejs\dsh.cmd` 或 PATH 中有 `dsh` 命令。

**Q: 桌面宠物不显示**
A: 检查 `assets/pet/` 目录下的精灵图是否存在。Windows 图标缓存问题可尝试删除 `%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache_*.db` 后重启 explorer。

**Q: PHYSMOL 工具不可用**
A: PHYSMOL 是可选依赖，需要 Python 3.10 和 PHYSMOL 服务代码。启动超时不会阻塞 dsh 主功能。

---

## License

[MIT](LICENSE)
