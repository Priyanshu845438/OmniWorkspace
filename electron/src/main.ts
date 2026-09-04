import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'path';
import { fork, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function startServerProcess() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (!isDev) {
    const serverEntry = path.join(__dirname, '../dist-server/index.js');
    try {
      serverProcess = fork(serverEntry, [], {
        env: { ...process.env, PORT: '3001' },
        silent: true,
      });
      console.log('[OmniWorkspace Electron] Embedded local server started (PID:', serverProcess.pid, ')');
    } catch (err) {
      console.error('[OmniWorkspace Electron] Failed to start local server process:', err);
    }
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-client/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServerProcess();
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
