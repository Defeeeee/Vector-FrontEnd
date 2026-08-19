/*
  La versión de la app viene de `package.json` y de ningún otro lado.

  Antes estaba escrita a mano adentro de `ChangelogNotice.tsx`, o sea dos fuentes de
  verdad que sólo coincidían por disciplina — y no coincidían: el componente anunciaba
  las novedades de la 2.7.0 mientras se habían publicado diez features más.

  Esto expone la versión **realmente construida**. `src/lib/changelog.ts` tiene la suya,
  y un test obliga a que sean la misma: si alguien sube `package.json` sin escribir las
  novedades, CI lo frena en vez de dejar la app mintiendo en silencio.
*/
const { version } = require("./package.json");

module.exports = {
  allowedDevOrigins: ["100.78.13.108"],
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};
