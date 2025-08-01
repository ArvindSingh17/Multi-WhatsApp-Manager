// electron/main.js (Main Process)

const { app, BrowserWindow, BrowserView, ipcMain, session, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let views = {};
let activeSessionId = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadURL('http://localhost:3000/'); 
    mainWindow.maximize();
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);

    // Event listeners for window changes to adjust BrowserView bounds
    mainWindow.webContents.on('devtools-opened', () => {
        console.log('DevTools opened');
        adjustAllBrowserViewBounds();
    });

    mainWindow.webContents.on('devtools-closed', () => {
        console.log('DevTools closed');
        adjustAllBrowserViewBounds();
    });

    mainWindow.on('resize', () => {
        adjustAllBrowserViewBounds();
    });

    mainWindow.on('move', () => {
        adjustAllBrowserViewBounds();
    });
}

// Function to adjust the BrowserView's bounds for ALL views
function adjustAllBrowserViewBounds() {
    if (!mainWindow) return;

    const { width, height } = mainWindow.getBounds();
    const reactSidebarWidth = 256; 
    const effectiveDevToolsHeight = mainWindow.webContents.isDevToolsOpened() ? 200 : 0; 

    // Iterate over all existing BrowserViews and adjust their bounds
    // The keys in 'views' are now session IDs
    for (const sessionId in views) {
        const view = views[sessionId];
        if (view && view.webContents && !view.webContents.isDestroyed()) {
            const newBounds = {
                x: reactSidebarWidth,
                y: 0,
                width: width - reactSidebarWidth,
                height: height - effectiveDevToolsHeight, // Subtract dev tools height if open
            };
            view.setBounds(newBounds);
            console.log(`BrowserView for session ID ${sessionId} bounds adjusted to:`, newBounds);
        }
    }
}


app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('Control+Shift+I', () => {
        if (mainWindow) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


// IPC handler to add a new WhatsApp session (now accepts sessionId)
ipcMain.handle('add-whatsapp', (event, sessionId) => {
    // If a view for this sessionId already exists, switch to it instead of creating a new one
    if (views[sessionId] && views[sessionId].webContents && !views[sessionId].webContents.isDestroyed()) {
        mainWindow.setBrowserView(views[sessionId]);
        activeSessionId = sessionId;
        adjustAllBrowserViewBounds(); // Adjust bounds for the newly active view
        views[sessionId].webContents.focus();
        return;
    }

    // Use the provided sessionId for the session partition
    const sessionPartition = `persist:wa-session-${sessionId}`;
    const view = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            session: session.fromPartition(sessionPartition),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    // Store the BrowserView using the sessionId as the key
    views[sessionId] = view;
    activeSessionId = sessionId; // Set newly added view as active
    mainWindow.setBrowserView(view);

    const customUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.127 Safari/537.36";

    view.webContents.loadURL('https://web.whatsapp.com/', {
        userAgent: customUserAgent
    });

    adjustAllBrowserViewBounds(); // Adjust bounds immediately after setting the BrowserView

    view.webContents.setWindowOpenHandler(({ url }) => {
        view.webContents.loadURL(url);
        return { action: 'deny' };
    });

    view.webContents.on('did-finish-load', () => {
        // Any BrowserView-specific injection logic can go here if needed
    });
});

// IPC handler to switch to a different WhatsApp session (now accepts sessionId)
ipcMain.handle('switch-whatsapp', (event, sessionId) => {
    const view = views[sessionId];

    if (!view || !view.webContents || view.webContents.isDestroyed()) {
        delete views[sessionId]; // Clean up invalid view references
        mainWindow.setBrowserView(null); // Clear the current BrowserView if the target is invalid
        activeSessionId = null;
        return;
    }

    mainWindow.setBrowserView(view);
    activeSessionId = sessionId; // Update active view ID

    adjustAllBrowserViewBounds(); // Adjust bounds immediately after switching the BrowserView

    view.webContents.focus();
});


// IPC handler to delete a WhatsApp session (now accepts sessionId)
ipcMain.handle('delete-whatsapp', async (event, sessionIdToRemove) => {
    const view = views[sessionIdToRemove];

    try {
        if (!view) return;

        const wasActive = activeSessionId === sessionIdToRemove; // Check if the deleted view was active

        // Clean session using the correct sessionId
        const sessionPartition = `persist:wa-session-${sessionIdToRemove}`;
        const currentSession = session.fromPartition(sessionPartition);
        await currentSession.clearStorageData();
        await currentSession.clearCache();

        if (view.webContents && !view.webContents.isDestroyed()) {
            view.webContents.destroy(); // Destroy the webContents
        }

        delete views[sessionIdToRemove]; // Remove from our tracking object using sessionId

        // If the deleted view was active, switch to the next available session
        if (wasActive) {
            // Get all remaining session IDs (keys of the 'views' object)
            const remainingSessionIds = Object.keys(views).map(Number).sort((a, b) => a - b); // Ensure numeric sort

            if (remainingSessionIds.length > 0) {
                const nextActiveSessionId = remainingSessionIds[0]; // Pick the first available ID
                const fallbackView = views[nextActiveSessionId];

                if (fallbackView && fallbackView.webContents && !fallbackView.webContents.isDestroyed()) {
                    mainWindow.setBrowserView(fallbackView);
                    activeSessionId = nextActiveSessionId; // Update active ID
                    adjustAllBrowserViewBounds(); // Adjust bounds for the new active view
                    fallbackView.webContents.focus();
                    // Notify frontend about the active session change, sending the sessionId
                    event.sender.send('active-session-changed', nextActiveSessionId);
                } else {
                    // Fallback view is invalid, try next one or clear
                    delete views[nextActiveSessionId]; // Remove invalid fallback
                    mainWindow.setBrowserView(null);
                    activeSessionId = null;
                    event.sender.send('active-session-changed', null); // No active session
                }
            } else {
                // No other valid views left
                mainWindow.setBrowserView(null);
                activeSessionId = null;
                event.sender.send('active-session-changed', null); // No active session
            }
        }

    } catch (err) {
        console.error(`Error deleting session ID ${sessionIdToRemove}:`, err);
    }
});

// IPC handlers for showing/hiding BrowserView (remain unchanged, as they operate on the currently set BrowserView)
ipcMain.handle('hide-browser-view', () => {
    if (mainWindow && mainWindow.getBrowserView()) {
        mainWindow.getBrowserView().setBounds({ x: 0, y: 0, width: 0, height: 0 }); // Shrink to hide
        console.log('BrowserView hidden.');
    }
});

ipcMain.handle('show-browser-view', () => {
    // Re-adjust bounds to make it visible again
    adjustAllBrowserViewBounds();
    console.log('BrowserView shown.');
});
