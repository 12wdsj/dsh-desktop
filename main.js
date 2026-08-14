const { app, BrowserWindow, shell, dialog, Menu, Tray, nativeImage } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const net = require('net')
const { autoUpdater } = require('electron-updater')

// 配置
const DSH_PORT = 3080
const DSH_HOST = '127.0.0.1'
const DSH_URL = `http://${DSH_HOST}:${DSH_PORT}`

let mainWindow = null
let dshProcess = null
let tray = null

// 检查端口是否被占用
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port, DSH_HOST)
  })
}

// 等待服务器就绪
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const check = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          resolve()
          return
        }
      } catch (e) {
        // 服务器还没准备好
      }
      if (Date.now() - startTime > timeout) {
        reject(new Error('服务器启动超时'))
        return
      }
      setTimeout(check, 500)
    }
    check()
  })
}

// 启动 dsh web 服务器
async function startDshServer() {
  const portInUse = await isPortInUse(DSH_PORT)
  if (portInUse) {
    console.log(`端口 ${DSH_PORT} 已被占用，假设 dsh 已在运行`)
    return true
  }

  // 查找 dsh 命令
  const dshPaths = [
    'dsh',  // 全局安装
    path.join(process.env.APPDATA || '', 'npm', 'dsh.cmd'),  // Windows npm 全局
    path.join(process.env.LOCALAPPDATA || '', 'npm', 'dsh.cmd'),
  ]

  let dshCmd = null
  for (const p of dshPaths) {
    try {
      const testProcess = spawn(p, ['--version'], { shell: true, stdio: 'pipe' })
      const result = await new Promise((resolve) => {
        testProcess.on('close', (code) => resolve(code === 0))
        testProcess.on('error', () => resolve(false))
        setTimeout(() => resolve(false), 3000)
      })
      if (result) {
        dshCmd = p
        break
      }
    } catch (e) {
      continue
    }
  }

  if (!dshCmd) {
    dialog.showErrorBox(
      '找不到 dsh',
      '请先安装 DeepSeek Harness：\nnpm install -g @deepseek-ai/dsh'
    )
    app.quit()
    return false
  }

  console.log(`使用 dsh: ${dshCmd}`)
  dshProcess = spawn(dshCmd, ['web', '--port', String(DSH_PORT)], {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })

  dshProcess.stdout.on('data', (data) => {
    console.log(`[dsh] ${data.toString().trim()}`)
  })

  dshProcess.stderr.on('data', (data) => {
    console.error(`[dsh] ${data.toString().trim()}`)
  })

  dshProcess.on('error', (err) => {
    console.error('启动 dsh 失败:', err)
    dialog.showErrorBox('启动失败', `无法启动 dsh: ${err.message}`)
  })

  dshProcess.on('close', (code) => {
    console.log(`dsh 进程退出，代码: ${code}`)
    dshProcess = null
  })

  // 等待服务器就绪
  try {
    await waitForServer(DSH_URL)
    console.log('dsh 服务器已就绪')
    return true
  } catch (err) {
    dialog.showErrorBox('启动超时', 'dsh 服务器启动超时，请检查日志')
    return false
  }
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'DSH Desktop',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Windows 特有设置
    skipTaskbar: false,
    frame: true,
    backgroundColor: '#1e1e2e',
  })

  // 加载 dsh web 界面
  mainWindow.loadURL(DSH_URL)

  // 外部链接在系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes(DSH_HOST)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // 窗口关闭时隐藏到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 创建菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新页面',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload(),
        },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true
            app.quit()
          },
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: () => checkForUpdates(),
        },
        { type: 'separator' },
        {
          label: '关于 DSH Desktop',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: 'DSH Desktop',
              detail: `DeepSeek Harness 桌面客户端\n蓝色小鲸鱼版 🐳\n\n版本: ${app.getVersion()}\n基于 Electron + DeepSeek Harness`,
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
}

// 创建系统托盘
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png')
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: '刷新',
      click: () => mainWindow?.reload(),
    },
    {
      label: '检查更新',
      click: () => checkForUpdates(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('DSH Desktop - DeepSeek Harness')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// 停止 dsh 服务器
function stopDshServer() {
  if (dshProcess) {
    console.log('正在停止 dsh 服务器...')
    dshProcess.kill()
    dshProcess = null
  }
}

// ==================== 自动更新 ====================

let updateDownloaded = false
let updateChecking = false

// 手动检查更新（托盘菜单 / 应用菜单共用）
async function checkForUpdates() {
  if (!app.isPackaged) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '开发模式',
      message: '开发模式下不支持检查更新',
      detail: '自动更新需要打包安装后的版本（app-update.yml 只在打包时生成）。',
    })
    return
  }
  if (updateChecking) {
    console.log('已有更新检查在进行中，跳过')
    return
  }
  updateChecking = true
  try {
    const result = await autoUpdater.checkForUpdates()
    // 已是最新版（update-available 事件没触发才走到这里）
    if (!result) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        detail: `DSH Desktop ${app.getVersion()}`,
      })
    }
  } catch (err) {
    console.error('检查更新失败:', err.message)
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '检查更新失败',
      message: '无法连接更新服务器',
      detail: '请检查网络连接，或确认发布源配置正确（package.json 的 publish 字段）。',
    })
  } finally {
    updateChecking = false
  }
}

function setupAutoUpdater() {
  // 开发模式下不检查更新（electron-updater 需要打包后的 app-update.yml）
  if (!app.isPackaged) {
    console.log('开发模式，跳过自动更新检查')
    return
  }

  // 更新检查出错（如 GitHub 连不上）时静默处理
  autoUpdater.on('error', (err) => {
    console.error('自动更新出错:', err.message)
  })

  // 发现新版本，提示用户
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `DSH Desktop ${info.version} 已发布`,
      detail: `当前版本 ${app.getVersion()}。是否立即下载更新？`,
      buttons: ['下载', '稍后'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '正在下载',
          message: '正在下载更新，请稍候...',
        })
        autoUpdater.downloadUpdate()
      }
    })
  })

  // 更新下载完成，提示重启
  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `DSH Desktop ${info.version} 已下载完成`,
      detail: '重启应用后生效。是否立即重启？',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        app.isQuitting = true
        autoUpdater.quitAndInstall()
      }
    })
  })

  // 策略：每次启动后 3 秒检查一次（延迟避免阻塞启动）
  setTimeout(() => {
    checkForUpdates()
  }, 3000)
}

// 退出前如果下载了更新，安装它
app.on('before-quit', () => {
  app.isQuitting = true
  stopDshServer()
  if (updateDownloaded) {
    autoUpdater.quitAndInstall()
  }
})

// 应用生命周期
app.whenReady().then(async () => {
  // 创建托盘
  createTray()

  // 设置自动更新
  setupAutoUpdater()

  // 启动 dsh 服务器
  const serverReady = await startDshServer()
  if (!serverReady) {
    app.quit()
    return
  }

  // 创建窗口
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Windows 上不退出，保持托盘运行
  if (process.platform !== 'win32') {
    app.quit()
  }
})

app.on('will-quit', () => {
  stopDshServer()
})
