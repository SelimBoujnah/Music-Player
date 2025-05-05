const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  // RPC-style calls
  selectMusicFolder:    () => ipcRenderer.invoke('select-music-folder'),
  getLastMusicFolder:   () => ipcRenderer.invoke('get-last-music-folder'),
  scanMusicFolder:      (folder) => ipcRenderer.invoke('scan-music-folder', folder),

  // Event listeners
  onFolderSelected:     (callback) => ipcRenderer.on('folder-selected', (event, arg) => callback(arg)),
  onTogglePlay:         (callback) => ipcRenderer.on('toggle-play',       () => callback()),
  onNextTrack:          (callback) => ipcRenderer.on('next-track',        () => callback()),
  onPrevTrack:          (callback) => ipcRenderer.on('prev-track',        () => callback()),

  // Progress reporting
  updateProgress:       (p) => ipcRenderer.send('update-progress', p),

  // Basic path utility (pure JS)
  basename: (filePath) => {
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1];
  }
});
