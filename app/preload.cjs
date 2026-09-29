const { contextBridge, ipcRenderer } = require('electron');
const listen = (channel, callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('pocketdev', {
  initial: () => ipcRenderer.invoke('initial'),
  settings: () => ipcRenderer.invoke('settings'),
  menu: () => ipcRenderer.invoke('menu'),
  preferences: value => ipcRenderer.invoke('preferences', value),
  preview: state => ipcRenderer.invoke('preview', state),
  photo: () => ipcRenderer.invoke('photo'),
  generate: key => ipcRenderer.invoke('generate', key),
  cancel: () => ipcRenderer.invoke('cancel'),
  import: () => ipcRenderer.invoke('import'),
  reset: () => ipcRenderer.invoke('reset'),
  onStatus: callback => listen('status', callback),
  onAppearance: callback => listen('appearance', callback),
  onProgress: callback => listen('progress', callback)
});
