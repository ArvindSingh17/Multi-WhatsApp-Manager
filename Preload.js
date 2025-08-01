const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    addWhatsApp: (index) => ipcRenderer.invoke('add-whatsapp', index),
    switchWhatsApp: (index) => ipcRenderer.invoke('switch-whatsapp', index),
    deleteWhatsApp: (index) => ipcRenderer.invoke('delete-whatsapp', index),
    onActiveSessionChanged: (callback) => ipcRenderer.on('active-session-changed', (event, index) => callback(index)),
    hideBrowserView: () => ipcRenderer.invoke('hide-browser-view'),
    showBrowserView: () => ipcRenderer.invoke('show-browser-view'),
});