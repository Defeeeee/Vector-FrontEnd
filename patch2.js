const fs = require('fs');
const file = 'src/components/social/ComposerPublicacion.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('notificar({ tipo: "error", titulo: "No se pudo publicar" });', 'notificar({ tipo: "error", titulo: "No se pudo publicar: " + err.message });');
fs.writeFileSync(file, content);
