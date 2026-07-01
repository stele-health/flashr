/*
 * Flashr preload — the only bridge between the UI and the native main process.
 * Exposes a tiny, safe `window.flashr` API. No Node access leaks to the page.
 */
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('flashr', {
  isElectron: true,
  readClipboard: () => ipcRenderer.invoke('flashr:readClipboard'),
  openFile: () => ipcRenderer.invoke('flashr:openFile'),
  flashOver: (text) => ipcRenderer.send('flashr:flashOver', text),
  closeFloat: () => ipcRenderer.send('flashr:closeFloat'),
  onText: (cb) => ipcRenderer.on('flashr:text', (_e, t) => cb(t)),
  getSettings: () => ipcRenderer.invoke('flashr:getSettings'),
  setHotkey: (which, accel) => ipcRenderer.invoke('flashr:setHotkey', which, accel),
  resetHotkeys: () => ipcRenderer.invoke('flashr:resetHotkeys'),
  onOpenSettings: (cb) => ipcRenderer.on('flashr:open-settings', () => cb()),
  readPath: (p) => ipcRenderer.invoke('flashr:readPath', p),
  pathForFile: (file) => webUtils.getPathForFile(file),
  // region selector overlay
  selectorDone: (rect) => ipcRenderer.send('flashr:region-selected', rect),
  selectorCancel: () => ipcRenderer.send('flashr:region-selected', null),
  // vault (managed library — files imported/owned by Flashr)
  listVault: () => ipcRenderer.invoke('flashr:listVault'),
  importToVault: (project) => ipcRenderer.invoke('flashr:importToVault', project),
  removeFromVault: (filePath) => ipcRenderer.invoke('flashr:removeFromVault', filePath),
  // projects (subfolders inside the vault)
  createProject: (name) => ipcRenderer.invoke('flashr:createProject', name),
  moveToProject: (filePath, project) => ipcRenderer.invoke('flashr:moveToProject', filePath, project),
  renameProject: (oldName, newName) => ipcRenderer.invoke('flashr:renameProject', oldName, newName),
  deleteProject: (name) => ipcRenderer.invoke('flashr:deleteProject', name),
  // external watched folder
  openWorkspace: () => ipcRenderer.invoke('flashr:openWorkspace'),
  listWorkspace: () => ipcRenderer.invoke('flashr:listWorkspace'),
  // pivot color
  setPivotColor: (color) => ipcRenderer.invoke('flashr:setPivotColor', color),
  onPivotColor: (cb) => ipcRenderer.on('flashr:pivotColor', (_e, c) => cb(c)),
  // background color
  setBgColor: (color) => ipcRenderer.invoke('flashr:setBgColor', color),
  onBgColor: (cb) => ipcRenderer.on('flashr:bgColor', (_e, c) => cb(c)),
});
