const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;
let views = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:3000/');
  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('add-whatsapp', (event, index) => {
  const userAgents = [
    'Mozilla/5.0 Chrome/121.0.0.0',
    'Mozilla/5.0 Firefox/115.0',
    'Mozilla/5.0 Edg/115.0.0.0',
    'Mozilla/5.0 Chrome/122.0.0.0 Safari/537.36'
  ];
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      session: session.fromPartition(`persist:wa-session-${index}`),
      contextIsolation: true,
      nodeIntegration: false,

    }
  });

  views[index] = view;
  mainWindow.setBrowserView(view);
  view.setBounds({ x: 250, y: 0, width: 1150, height: 900 });
  const customUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  view.webContents.loadURL('https://web.whatsapp.com', {
    userAgent: customUserAgent
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    view.webContents.loadURL(url);
    return { action: 'deny' };
  });
});

// SWITCH WHATSAPP
ipcMain.handle('switch-whatsapp', (event, index) => {
  const view = views[index];


  if (!view || !view.webContents || view.webContents.isDestroyed()) {
    delete views[index];
    return;
  }

  mainWindow.setBrowserView(view);
  view.setBounds({ x: 250, y: 0, width: 1150, height: 900 });
  view.webContents.focus();
});


// DELETE WHATSAPP
ipcMain.handle('delete-whatsapp', async (event, index) => {
  const view = views[index];

  try {
    if (!view) {
      console.warn(`No view found at index ${index}`);
      return;
    }

    if (mainWindow.getBrowserView() === view) {
      mainWindow.setBrowserView(null);
      const currentSession = session.fromPartition(`persist:wa-session-${index}`);
      await currentSession.clearStorageData();
    }

    if (view.webContents && !view.webContents.isDestroyed()) {
      view.webContents.destroy();
    }

    delete views[index];
    console.log(`View at index ${index} deleted.`);
    
  } catch (err) {
    console.error(`Failed to delete view at index ${index}:`, err);
  }
});




