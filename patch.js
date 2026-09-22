const fs = require('fs');
const file = 'src/components/social/ComposerPublicacion.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('if (!res.ok) throw new Error();', 'if (!res.ok) { const txt = await res.text(); console.error("Error from backend:", txt); throw new Error(txt); }');
fs.writeFileSync(file, content);
