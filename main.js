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

  mainWindow.on('resize',()=>{
  const bounds = mainWindow.getBounds();
  const reactSidebarWidth = 256;
  const currentView = mainWindow.getBrowserView();
  if (currentView) {
    currentView.setBounds({
      x:reactSidebarWidth,
      y:0,
      width:bounds.width-reactSidebarWidth,
      height:bounds.height
    })

  }
})
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});



ipcMain.handle('add-whatsapp', (event, index) => {
    const sessionId = `persist:wa-session-${index}-${Date.now()}`;
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      session: session.fromPartition(sessionId),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  views[index] = view;
  const customUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.127 Safari/537.36";

  view.webContents.loadURL('https://web.whatsapp.com/', {
    userAgent: customUserAgent
  });

mainWindow.setBrowserView(view);
const { width, height } = mainWindow.getBounds();
const reactSidebarWidth = 256;

view.setBounds({
  x: reactSidebarWidth,
  y: 0,
  width: width - reactSidebarWidth,
  height: height
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
const bounds = mainWindow.getBounds();
const { width, height } = mainWindow.getBounds();
const reactSidebarWidth = 256;

view.setBounds({
  x: reactSidebarWidth,
  y: 0,
  width: width - reactSidebarWidth,
  height: height
});

  view.webContents.focus();
});


// DELETE WHATSAPP
ipcMain.handle('delete-whatsapp', async (event, index) => {
  const view = views[index];

  try {
    if (!view) return;

    const wasActive = mainWindow.getBrowserView() === view;

    // Clean session
    const currentSession = session.fromPartition(`persist:wa-session-${index}`);
    await currentSession.clearStorageData();
    await currentSession.clearCache();

    if (view.webContents && !view.webContents.isDestroyed()) {
      view.webContents.destroy();
    }

    delete views[index];

    // ✅ If it was active, switch to next available session
    if (wasActive) {
      const sortedIndexes = Object.keys(views).map(Number).sort();

      for (const fallbackIndex of sortedIndexes) {
        const fallbackView = views[fallbackIndex];
        if (fallbackView && fallbackView.webContents && !fallbackView.webContents.isDestroyed()) {
          mainWindow.setBrowserView(fallbackView);

          const bounds = mainWindow.getBounds();
          const sidebarWidth = 256;

          fallbackView.setBounds({
            x: sidebarWidth,
            y: 0,
            width: bounds.width - sidebarWidth,
            height: bounds.height
          });

          fallbackView.webContents.focus();

          // ✅ Notify frontend
          event.sender.send('active-session-changed', fallbackIndex);

          break; // ⛔ stop after finding first good session
        }
      }

      //  No other valid views left
      if (Object.keys(views).length === 0) {
        mainWindow.setBrowserView(null);
      }
    }

  } catch (err) {
    console.error(`Error deleting session ${index}:`, err);
  }
});





