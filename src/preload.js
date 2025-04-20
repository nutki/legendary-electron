const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (event, data) => callback(data)),
    sendClickEvent: (data) => ipcRenderer.send('button-click', data),
    onAssetBundles: (callback) => ipcRenderer.on('asset-bundles', (event, data) => callback(data)),
});
