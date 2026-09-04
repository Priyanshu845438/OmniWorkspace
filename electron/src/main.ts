import { app, BrowserWindow, shell, Menu } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

const SERVER_PORT = 3001;

function log(msg: string) {
  console.log(`[OmniWorkspace] ${msg}`);
}

function logError(msg: string, err?: unknown) {
  console.error(`[OmniWorkspace ERROR] ${msg}`, err || '');
}

/**
 * Start the embedded Express server by require()-ing the compiled
 * server code directly in the Electron main process.
 *
 * This approach works because:
 * 1. Electron's patched require() transparently resolves native
 *    modules from the app.asar.unpacked/ directory.
 * 2. No child process or utility process needed — the server
 *    runs in-process which is simpler and more reliable.
 * 3. The Express server's app.listen() call happens as a
 *    side-effect of requiring the module.
 */
function startEmbeddedServer(): void {
  const isDev = !app.isPackaged;

  if (isDev) {
    log('Dev mode — assuming external server on :3001');
    return;
  }

  const serverEntry = path.join(app.getAppPath(), 'dist-server', 'index.js');
  log(`Loading embedded server in-process from: ${serverEntry}`);

  // Set env vars the server expects BEFORE requiring it
  process.env.PORT = String(SERVER_PORT);
  process.env.OMNI_WORKSPACE_ROOT = app.getPath('userData');
  process.env.NODE_ENV = 'production';

  try {
    require(serverEntry);
    log(`Embedded server loaded successfully on port ${SERVER_PORT}`);
  } catch (err) {
    logError('Failed to load embedded server:', err);
  }
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload Workspace',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'OmniWorkspace GitHub Repository',
          click: () => shell.openExternal('https://github.com/omniworkspace/omni-workspace'),
        },
        {
          label: 'Report Issue / Feedback',
          click: () => shell.openExternal('https://github.com/omniworkspace/omni-workspace/issues'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OmniWorkspace — Universal AI Platform',
    icon: path.join(__dirname, '../resources/icon.png'),
    backgroundColor: '#0b0f19',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    log('Loading dev server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, the Express server is already running in-process.
    // Give it a tiny moment to bind to the port, then load the URL.
    log(`Loading production UI from http://localhost:${SERVER_PORT}`);
    const loadWithRetry = (retries = 20) => {
      mainWindow?.loadURL(`http://localhost:${SERVER_PORT}`).catch((err) => {
        log(`loadURL attempt failed (${retries} left): ${err.message}`);
        if (retries > 0) {
          setTimeout(() => loadWithRetry(retries - 1), 500);
        } else {
          // Last resort: load the HTML directly from the asar
          log('Falling back to direct loadFile from asar');
          const htmlPath = path.join(app.getAppPath(), 'dist-client', 'index.html');
          mainWindow?.loadFile(htmlPath).catch((e) => {
            logError('loadFile fallback also failed:', e);
          });
        }
      });
    };

    // Small delay to let Express finish binding
    setTimeout(() => loadWithRetry(), 1000);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ──────────────────────────────────────────────────
app.whenReady().then(() => {
  log(`App ready — packaged: ${app.isPackaged}, platform: ${process.platform}`);
  log(`App path : ${app.getAppPath()}`);
  log(`User data: ${app.getPath('userData')}`);

  // Start server first (synchronous require), then create the UI
  startEmbeddedServer();
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
