const fs = require('fs');
const path = require('path');

const dirJsPath = path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'utils', 'dir.js');

if (!fs.existsSync(dirJsPath)) {
  process.exit(0);
}

let content = fs.readFileSync(dirJsPath, 'utf8');

if (!content.includes('copyRecursiveSync')) {
  const target = `const copySync = (src, dest)=>{
    const destParent = _path().default.dirname(dest);
    if (!_fs().default.existsSync(destParent)) ensureDirectory(destParent);
    _fs().default.cpSync(src, dest, {
        recursive: true,
        force: true
    });
};
const copyAsync = async (src, dest)=>{
    const destParent = _path().default.dirname(dest);
    if (!_fs().default.existsSync(destParent)) {
        await _fs().default.promises.mkdir(destParent, {
            recursive: true
        });
    }
    await _fs().default.promises.cp(src, dest, {
        recursive: true,
        force: true
    });
};`;

  const replacement = `function copyRecursiveSync(src, dest) {
    const stats = _fs().default.lstatSync(src);
    if (stats.isDirectory()) {
        if (!_fs().default.existsSync(dest)) {
            _fs().default.mkdirSync(dest, { recursive: true });
        }
        for (const child of _fs().default.readdirSync(src)) {
            copyRecursiveSync(_path().default.join(src, child), _path().default.join(dest, child));
        }
    } else if (stats.isSymbolicLink()) {
        const linkTarget = _fs().default.readlinkSync(src);
        _fs().default.symlinkSync(linkTarget, dest);
    } else {
        _fs().default.copyFileSync(src, dest);
    }
}
const copySync = (src, dest)=>{
    const destParent = _path().default.dirname(dest);
    if (!_fs().default.existsSync(destParent)) ensureDirectory(destParent);
    copyRecursiveSync(src, dest);
};
const copyAsync = async (src, dest)=>{
    const destParent = _path().default.dirname(dest);
    if (!_fs().default.existsSync(destParent)) {
        await _fs().default.promises.mkdir(destParent, {
            recursive: true
        });
    }
    copyRecursiveSync(src, dest);
};`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(dirJsPath, content, 'utf8');
    console.log('[patch-expo-cli] Applied Windows UTF-8 path patch to @expo/cli');
  }
}
