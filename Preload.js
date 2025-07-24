const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  addWhatsApp: (i) => ipcRenderer.invoke('add-whatsapp', i),
  switchWhatsApp: (i) => ipcRenderer.invoke('switch-whatsapp', i),
   deleteWhatsApp: (index) => ipcRenderer.invoke('delete-whatsapp', index),
   
});
