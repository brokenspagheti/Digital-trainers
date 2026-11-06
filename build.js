// Inlines src/ into a single self-contained index.html
const fs = require('fs');
const r = (f) => fs.readFileSync(__dirname + '/src/' + f, 'utf8');
const js = [r('engine.js'), r('presets.js'), r('app.js')].join('\n').replace(/<\/script/g, '<\\/script');
fs.writeFileSync(__dirname + '/index.html', r('template.html').replace('/*CSS*/', () => r('style.css')).replace('/*JS*/', () => js));
console.log('built index.html');
