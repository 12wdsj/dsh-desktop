const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  // 桌面宠物专用
  petMove: (dx, dy) => ipcRenderer.send('pet-move', { dx, dy }),
  petOpenMain: () => ipcRenderer.send('pet-open-main'),
  onPetSay: (callback) => ipcRenderer.on('pet-say', (_event, text) => callback(text)),
})
