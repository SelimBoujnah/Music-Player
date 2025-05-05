const { app, BrowserWindow, dialog, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const ElectronStore = require('electron-store').default;
const userPreferences = new ElectronStore();

let mainWindow;
let tray = null;

const base64Icon = nativeImage.createFromDataURL(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
);

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index1.html');

  mainWindow.webContents.on('did-finish-load', () => {
    const folder = userPreferences.get('lastMusicFolder');
    if (folder) {
      mainWindow.webContents.send('folder-selected', folder);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  tray = new Tray(base64Icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Play/Pause', click: () => mainWindow?.webContents.send('toggle-play') },
    { label: 'Next Track', click: () => mainWindow?.webContents.send('next-track') },
    { label: 'Previous Track', click: () => mainWindow?.webContents.send('prev-track') },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]);
  tray.setToolTip('Music Player');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  const storedFolder = userPreferences.get('lastMusicFolder', null);

  const proceedWithApp = async (folderPath) => {
    userPreferences.set('lastMusicFolder', folderPath);
    await createWindow();
    setupTray();
  };

  if (storedFolder) {
    proceedWithApp(storedFolder);
  } else {
    dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Music Folder'
    }).then(result => {
      if (result.canceled || !result.filePaths.length) {
        app.quit();
        return;
      }
      proceedWithApp(result.filePaths[0]);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return null;
  const newFolder = result.filePaths[0];
  userPreferences.set('lastMusicFolder', newFolder);
  return newFolder;
});

ipcMain.handle('get-last-music-folder', () => {
  return userPreferences.get('lastMusicFolder', null);
});

ipcMain.handle('scan-music-folder', async (event, folder) => {
  if (!folder) return [];
  try {
    const items = fs.readdirSync(folder);
    const audioFiles = items.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext);
    });
    return audioFiles.map(file => ({ path: path.join(folder, file), name: path.basename(file, path.extname(file)) }));
  } catch (err) {
    console.error('Error scanning folder:', err);
    return [];
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }]
  });
  if (result.canceled || !result.filePaths.length) return [];
  return result.filePaths.map(fp => ({ path: fp, name: path.basename(fp) }));
});

ipcMain.on('update-progress', (event, progress) => {
  if (!mainWindow) return;
  if (process.platform === 'win32') mainWindow.setProgressBar(progress);
  else if (process.platform === 'darwin') app.dock.setProgressBar(progress);
});

app.on('media-control', (event, mediaAction) => {
  if (!mainWindow) return;
  switch (mediaAction) {
    case 'play':
    case 'pause':
      mainWindow.webContents.send('toggle-play');
      break;
    case 'nexttrack':
      mainWindow.webContents.send('next-track');
      break;
    case 'previoustrack':
      mainWindow.webContents.send('prev-track');
      break;
  }
});
 HEAD




app.whenReady().then(() => {

  // Media key support
  app.on('media-control', (event, mediaAction) => {
    switch (mediaAction) {
      case 'play':
      case 'pause':
        mainWindow.webContents.send('toggle-play');
        break;
      case 'nexttrack':
        mainWindow.webContents.send('next-track');
        break;
      case 'previoustrack':
        mainWindow.webContents.send('prev-track');
        break;
    }
  });
});


//=======
//>>>>>>> 24ea65baac394c76a37513818ae432a4a9c7901b
