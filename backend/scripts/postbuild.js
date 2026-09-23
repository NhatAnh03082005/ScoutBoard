const fs = require('fs');
const path = require('path');

const distMain = path.resolve(__dirname, '../dist/main.js');
const distSrcMain = path.resolve(__dirname, '../dist/src/main.js');

if (!fs.existsSync(distMain) && fs.existsSync(distSrcMain)) {
  fs.writeFileSync(distMain, 'require("./src/main");\n');
  console.log('[postbuild] Created dist/main.js forwarding to dist/src/main.js');
}
