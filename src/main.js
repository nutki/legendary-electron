const { shell, app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const download = require('../legendary/tools/download');
async function copyAssetsToUserData(file) {
    const userDataPath = app.getPath('userData');
    const sourcePath = path.join(__dirname, '../legendary', file); // Path to your HTML assets
    const targetPath = path.join(userDataPath, 'legendary', file); // Target directory in userData

    async function copyRecursiveAsync(src, dest) {
        try {
            const srcStats = await fs.promises.lstat(src);

            if (!srcStats.isDirectory()) {
                // Copy file
                await fs.promises.copyFile(src, dest);
                console.log(`File copied to: ${dest}`);
                return;
            }

            // Ensure destination directory exists
            await fs.promises.mkdir(dest, { recursive: true });

            // Read directory entries
            const entries = await fs.promises.readdir(src, { withFileTypes: true });

            // Recursively copy each entry
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                if (entry.isDirectory()) {
                    await copyRecursiveAsync(srcPath, destPath);
                } else {
                    await fs.promises.copyFile(srcPath, destPath);
                }
            }
        } catch (err) {
            console.error(`Error copying from ${src} to ${dest}:`, err.message);
        }
    }

    // Start copying assets
    await copyRecursiveAsync(sourcePath, targetPath);
    console.log(`Assets copied to: ${targetPath}`);
}

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
        },
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    console.log('CWD:', process.cwd());
    console.log('__dirname:', __dirname); 
    console.log('userData', app.getPath('userData'));
    function progressCallback(current, total) {
        mainWindow.webContents.send('progress-update', { current, total });
    }
    ipcMain.on('button-click', (event, data) => {
        console.log('Button clicked in renderer process:', data);
        if (data.button === 'start') {
            mainWindow.setFullScreen(true);
            mainWindow.loadFile(path.join(app.getPath('userData'), 'legendary/legendary.html'));
        } else if (data.button === 'download') {
            download.main(data.asset, path.join(app.getPath('userData'), 'legendary'), progressCallback)
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    // Start the download and asset copying process
    for (const n of ['cards', 'icons', 'images', 'legendary.html', 'legendary.js', 'legendary.js.map', 'ui.js', 'ui.js.map', 'version.js']) {
        await copyAssetsToUserData(n);
    }
    await download.main("Others", path.join(app.getPath('userData'), 'legendary'), progressCallback);
    await download.main("Legendary", path.join(app.getPath('userData'), 'legendary'), progressCallback);
    const assets = download.checkAssets(path.join(app.getPath('userData'), 'legendary'), progressCallback);
    console.log('Assets:', assets);
    mainWindow.webContents.send('asset-bundles', assets);
    // Load the HTML file from userData

    mainWindow.on('closed', () => {
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});