const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `              if (prog.item) {
                  if (prog.error) corruptItems.push(prog.item);
                  else {
                      finalItems.push(prog.item);
                      scannedCount++;
                  }
              }`,
  `              if (prog.item) {
                  if (prog.error) {
                      const idx = corruptItems.findIndex(i => i.id === prog.item.id);
                      if (idx >= 0) corruptItems[idx] = prog.item;
                      else corruptItems.push(prog.item);
                  } else {
                      const idx = finalItems.findIndex(i => i.id === prog.item.id);
                      if (idx >= 0) finalItems[idx] = prog.item;
                      else finalItems.push(prog.item);
                      scannedCount++;
                  }
              }`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx');
