const { app, BrowserWindow, dialog, ipcMain, Tray, Menu, nativeImage  } = require('electron');
const path = require('path');
const fs = require('fs');
const ElectronStore = require( 'electron-store').default;
const userPreferences = new ElectronStore();

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let tray = null

const base64Icon = nativeImage.createFromDataURL(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
)

function createWindow() {

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,             // Disable for security
      contextIsolation: true,             // Required for contextBridge
      preload: path.join(__dirname, 'preload.js')
    }
    
  });

  // Load the index.html of the app
  mainWindow.loadFile('index1.html');
  
  // Open the DevTools in development (comment out for production)
  mainWindow.webContents.openDevTools();

  

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();


  // Tray Setup 
  tray = new Tray(base64Icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Play/Pause', click: () => mainWindow.webContents.send('toggle-play') },
    { label: 'Next Track', click: () => mainWindow.webContents.send('next-track') },
    { label: 'Previous Track', click: () => mainWindow.webContents.send('prev-track') },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]);
  tray.setToolTip('Music Player');
  tray.setContextMenu(contextMenu);

  
  app.on('activate', function () {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});




// Handle folder selection and save to preferences
ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    userPreferences.set('lastMusicFolder', result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

// Handler to get the last used folder
ipcMain.handle('get-last-music-folder', () => {
  return userPreferences.get('lastMusicFolder', null);
});

// Handle scanning a music folder for audio files
ipcMain.handle('scan-music-folder', async (event, folder) => {
  if (!folder) return [];
  
  try {
    const files = fs.readdirSync(folder);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext);
    });
    
    return audioFiles.map(file => {
      const filePath = path.join(folder, file);
      return {
        path: filePath,
        name: path.basename(file, path.extname(file))
      };
    });
  } catch (error) {
    console.error('Error scanning folder:', error);
    return [];
  }
});



// Handle file dialog open requests from renderer
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
    ]
  });
  
  if (!result.canceled) {
    // Read file data for each selected file
    const fileData = await Promise.all(result.filePaths.map(async (filePath) => {
      return {
        path: filePath,
        name: path.basename(filePath)
      };
    }));
    
    return fileData;
  }

  return [];


});

ipcMain.on('update-progress', (event, progress) => {
  if (mainWindow) {
    // Set progress on Windows taskbar
    if (process.platform === 'win32') {
      mainWindow.setProgressBar(progress);
    }
    // For macOS progress is shown in dock
    else if (process.platform === 'darwin') {
      app.dock.setProgressBar(progress);
    }
  }
});




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


