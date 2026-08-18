const fs = require('fs');
const path = require('path');

const srcTauriBin = path.join(__dirname, '..', 'src-tauri', 'bin');
if (!fs.existsSync(srcTauriBin)) {
    fs.mkdirSync(srcTauriBin, { recursive: true });
}

try {
    const ffprobeStaticPkg = require.resolve('ffprobe-static/package.json');
    const staticPath = path.join(path.dirname(ffprobeStaticPkg), 'bin');
    
    if (fs.existsSync(path.join(staticPath, 'linux', 'x64', 'ffprobe'))) {
        fs.copyFileSync(path.join(staticPath, 'linux', 'x64', 'ffprobe'), path.join(srcTauriBin, 'ffprobe-x86_64-unknown-linux-gnu'));
        fs.chmodSync(path.join(srcTauriBin, 'ffprobe-x86_64-unknown-linux-gnu'), 0o755);
    }
    
    if (fs.existsSync(path.join(staticPath, 'win32', 'x64', 'ffprobe.exe'))) {
        fs.copyFileSync(path.join(staticPath, 'win32', 'x64', 'ffprobe.exe'), path.join(srcTauriBin, 'ffprobe-x86_64-pc-windows-msvc.exe'));
    }
    
    if (fs.existsSync(path.join(staticPath, 'darwin', 'x64', 'ffprobe'))) {
        fs.copyFileSync(path.join(staticPath, 'darwin', 'x64', 'ffprobe'), path.join(srcTauriBin, 'ffprobe-x86_64-apple-darwin'));
        fs.chmodSync(path.join(srcTauriBin, 'ffprobe-x86_64-apple-darwin'), 0o755);
    }
    
    const arm64Target = path.join(srcTauriBin, 'ffprobe-aarch64-apple-darwin');
    if (!fs.existsSync(arm64Target)) {
        if (fs.existsSync(path.join(staticPath, 'darwin', 'arm64', 'ffprobe'))) {
            fs.copyFileSync(path.join(staticPath, 'darwin', 'arm64', 'ffprobe'), arm64Target);
            fs.chmodSync(arm64Target, 0o755);
        }
    } else {
        fs.chmodSync(arm64Target, 0o755);
    }
    
    console.log("Successfully copied ffprobe binaries for Tauri sidecar.");
} catch (e) {
    console.error("Failed to copy ffprobe binaries: ", e.message);
}
