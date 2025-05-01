const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  updateProgress: (progress) => ipcRenderer.send('update-progress', progress),
  getLastMusicFolder: () => ipcRenderer.invoke('get-last-music-folder'),
    selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
    scanMusicFolder: (folder) => ipcRenderer.invoke('scan-music-folder', folder),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    // Add IPC listeners for tray actions
    onTogglePlay: (callback) => ipcRenderer.on('toggle-play', () => callback()),
    onNextTrack: (callback) => ipcRenderer.on('next-track', () => callback()),
    onPrevTrack: (callback) => ipcRenderer.on('prev-track', () => callback()),
    // Path utilities
    basename: (filePath, ext) => path.basename(filePath, ext)

    
  }
);
