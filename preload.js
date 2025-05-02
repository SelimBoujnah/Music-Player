const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Progress and playback control
  updateProgress: (progress) => ipcRenderer.send('update-progress', progress),
  onTogglePlay: (callback) => ipcRenderer.on('toggle-play', () => callback()),
  onNextTrack: (callback) => ipcRenderer.on('next-track', () => callback()),
  onPrevTrack: (callback) => ipcRenderer.on('prev-track', () => callback()),

  // Folder management
  getLastMusicFolder: () => ipcRenderer.invoke('get-last-music-folder'),
  selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
  scanMusicFolder: (folder) => ipcRenderer.invoke('scan-music-folder', folder),
  saveFolders: (folders) => ipcRenderer.invoke('save-folders', folders),
  getSavedFolders: () => ipcRenderer.invoke('get-saved-folders'),

  // File management
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Path utilities
  basename: (filePath, ext) => path.basename(filePath, ext)
});