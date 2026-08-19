import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { componerFicha, datosAip, icaosConAip, textoFrecuencia, textoPista } from "./aip";
import { pistasDesdeMadhel } from "./briefing";

/**
 * **Éste es el test que existe por un bug concreto, y el único que lo habría evitado.**
 *
 * Vector mostraba las frecuencias de los ocho aeródromos controlados desde una tabla
 * escrita a mano, rotulada en pantalla como "Ficha Operativa Oficial ANAC MADHEL". De
 * sus veintiséis frecuencias **sólo tres coincidían con el AIP**. San Fernando tenía la
 * torre en 118.45 cuando son 119.00 y 120.05. El Palomar tenía la pista 17/35 anotada
 * como 16/34 — el número pintado en el umbral. Aeroparque, 2700 m de pista donde mide
 * 2350.
 *
 * Nada de eso era detectable leyendo el código: los números se ven razonables. Lo
 * encontró un piloto cruzando la pantalla con la carta.
 *
 * La prueba de abajo hace esa comparación automáticamente: **cada frecuencia y cada
 * medida que la app muestra tiene que aparecer literalmente en el texto extraído del PDF
 * oficial de ANAC**, que está commiteado en `src/data/aip/<ICAO>.txt`. No se puede
 * escribir un número que el AIP no diga.
 *
 * Corre sin red: el texto del AIP está en el repo. Para actualizarlo cuando cambie el
 * ciclo AIRAC, `npm run build:aip`.
 */

const RAIZ = process.cwd();

function textoDelAip(icao: string): string {
  const archivo = path.join(RAIZ, "src", "data", "aip", `${icao}.txt`);
  return fs.readFileSync(archivo, "utf8");
}

/**
 * Se compara sin espacios y sin distinguir mayúsculas, pero **sin tocar un solo dígito**,
 * que es lo único que este test cuida.
 *
 * Las dos concesiones tienen un motivo medido, no son prudencia genérica. Los espacios,
 * porque la extracción del PDF corta las celdas donde quiere y `H24CAUX 118.90 MHz` sale
 * pegado. Las mayúsculas, porque **el AIP de Córdoba escribe `119.10 MHZ`** con la unidad
 * en mayúscula en dos de sus filas: comparar con distinción de caja daba rojo por una
 * errata de ANAC y no por un dato equivocado nuestro.
 */
function normalizar(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

describe("los datos del AIP están respaldados por el PDF oficial", () => {
  const icaos = icaosConAip();

  it("hay ocho aeródromos, que son los controlados que MADHEL deja vacíos", () => {
    expect(icaos).toEqual(["SAAR", "SABE", "SACO", "SADF", "SADP", "SAEZ", "SAZM", "SAZS"]);
  });

  it.each(icaos)("%s: cada frecuencia está en el texto del AIP", (icao) => {
    const texto = normalizar(textoDelAip(icao));
    const datos = datosAip(icao)!;
    expect(datos.frecuencias.length).toBeGreaterThan(0);

    for (const f of datos.frecuencias) {
      /*
        `119.00 MHz` con el espacio sacado. Es la cadena exacta que imprime el AIP en la
        columna 4, así que un dígito cambiado no la encuentra.
      */
      expect(texto, `${icao} ${f.servicio} ${f.mhz}`).toContain(normalizar(`${f.mhz} MHz`));
    }
  });

  it.each(icaos)("%s: cada pista está en el texto del AIP", (icao) => {
    const texto = normalizar(textoDelAip(icao));
    const crudo = textoDelAip(icao);
    const datos = datosAip(icao)!;

    /*
      Los designadores se buscan en el texto **sin normalizar**. En AD 2.12 cada cabecera
      abre su propia fila —`05 044.19°`— así que arranca renglón; contra el texto pegado,
      un `02` quedaría rodeado de dígitos de la fila anterior y no habría forma de
      distinguir el designador de un pedazo de coordenada.
    */
    for (const p of datos.pistas) {
      for (const cabecera of p.designador.split("/")) {
        expect(crudo, `${icao} designador ${cabecera}`).toMatch(new RegExp(`^${cabecera}(\\D|$)`, "m"));
      }
    }

    for (const p of datos.pistas) {
      // Las dimensiones, tal como las publica la columna 3 de AD 2.12.
      expect(texto, `${icao} dimensiones ${p.dimensiones}`).toContain(normalizar(p.dimensiones));
    }
  });

  it.each(icaos)("%s: la ubicación y el combustible están en el texto del AIP", (icao) => {
    const texto = normalizar(textoDelAip(icao));
    const datos = datosAip(icao)!;

    if (datos.ubicacion) {
      expect(texto, `${icao} ubicación`).toContain(normalizar(datos.ubicacion));
    }

    /*
      El combustible se verifica **tipo por tipo** y no como una cadena entera, porque el
      AIP los intercala con las capacidades: Córdoba escribe "AVGAS 100LL 20.000 litros -
      JET A-1 600.000 litros". Un `AVGAS 100LL` suelto sí aparece; la cadena condensada,
      no.

      Y ésta es la prueba que atrapa el error más caro de la tabla vieja: decía que en
      **Ezeiza hay AVGAS 100LL**, y el AD 2 de Ezeiza no nombra AVGAS ni una vez. Un
      piloto de pistón planificando una escala con eso se queda en tierra.
    */
    for (const tipo of datos.combustible.split(",").map((t) => t.trim()).filter(Boolean)) {
      expect(texto, `${icao} combustible ${tipo}`).toContain(normalizar(tipo));
    }
  });

  it("el AVGAS que le inventábamos a Ezeiza no existe", () => {
    expect(normalizar(textoDelAip("SAEZ"))).not.toContain("AVGAS");
    expect(datosAip("SAEZ")!.combustible).toBe("JET A-1");
  });

  it("las frecuencias que mostrábamos mal no están en el AIP", () => {
    /*
      Las cuatro que el piloto cruzó contra la carta. Ninguna aparece en el documento
      oficial, y ésta es la línea que lo demuestra: si mañana alguien las vuelve a escribir
      en el TSV, el test de arriba se pone rojo por exactamente esta razón.
    */
    expect(normalizar(textoDelAip("SADF"))).not.toContain(normalizar("118.45 MHz")); // TWR SADF
    expect(normalizar(textoDelAip("SAAR"))).not.toContain(normalizar("118.20 MHz")); // TWR SAAR
    expect(normalizar(textoDelAip("SAZS"))).not.toContain(normalizar("118.00 MHz")); // TWR SAZS
    expect(normalizar(textoDelAip("SABE"))).not.toContain(normalizar("120.40 MHz")); // TWR SABE
  });
});

describe("cada aeródromo declara de cuándo es su dato", () => {
  it.each(icaosConAip())("%s tiene edición y fecha de vigencia", (icao) => {
    /*
      **Sin fecha, un dato de navegación obliga al piloto a suponer, y lo que suponga va a
      ser optimista.** El AIP se enmienda cada 28 días; la pantalla muestra esto.
    */
    const fuente = datosAip(icao)!.fuente;
    expect(fuente).not.toBeNull();
    expect(fuente!.edicion).toMatch(/^\d{2}\/\d{2}$/);
    expect(fuente!.vigenteDesde).toMatch(/^\d{2}-[A-Za-z]{3}-\d{2}$/);
    expect(fuente!.url).toMatch(/^https:\/\/ais\.anac\.gob\.ar\//);
  });
});

describe("datosAip", () => {
  it("acepta el ICAO en cualquier caja", () => {
    expect(datosAip("sadf")?.frecuencias.length).toBeGreaterThan(0);
    expect(datosAip("  SADF ")?.frecuencias.length).toBeGreaterThan(0);
  });

  it("devuelve null para un aeródromo que no está en el AIP", () => {
    /*
      **La Plata es el caso que importa acá.** No es controlado, así que no tiene AD 2 en
      el AIP — y MADHEL sí publica sus datos. Que devuelva `null` es lo que hace que el
      dato de ANAC llegue a la pantalla en vez de ser pisado, que era el segundo bug.
    */
    expect(datosAip("SADL")).toBeNull();
    expect(datosAip("SADM")).toBeNull();
    expect(datosAip("")).toBeNull();
  });

  it("San Fernando tiene las frecuencias que dice el AIP y no las que mostrábamos", () => {
    const f = datosAip("SADF")!.frecuencias;
    const torre = f.filter((x) => x.servicio === "TWR").map((x) => x.mhz);
    expect(torre).toEqual(["119.00", "120.05"]);
    expect(f.map((x) => x.mhz)).not.toContain("118.45");
    // Y la de rodaje era 121.90; son 121.85.
    expect(f.find((x) => x.servicio === "SMC")?.mhz).toBe("121.85");
  });

  it("El Palomar tiene la 17/35, que es la que está pintada", () => {
    expect(datosAip("SADP")!.pistas.map((p) => p.designador)).toEqual(["17/35"]);
  });
});

describe("cómo se leen", () => {
  it("una frecuencia con canal y distintivo", () => {
    expect(
      textoFrecuencia({ servicio: "TWR", distintivo: "Fernando Torre", canal: "CPPL", mhz: "119.00", horario: "H24", nota: "" })
    ).toBe("TWR CPPL 119.00 MHz — Fernando Torre · H24");
  });

  it("una sin canal ni horario no arrastra separadores sueltos", () => {
    expect(textoFrecuencia({ servicio: "ATIS", distintivo: "", canal: "", mhz: "127.90", horario: "", nota: "" })).toBe(
      "ATIS 127.90 MHz"
    );
  });

  it("una pista, sin el punto de millar", () => {
    expect(
      textoPista({ designador: "13/31", dimensiones: "2.350x45", superficie: "CONC", resistencia: "PCR 1170/R/C/W/T" })
    ).toBe("13/31 2350x45 M - CONC - PCR 1170/R/C/W/T");
  });

  it("y el parser de pistas de MADHEL saca el largo correcto de esa cadena", () => {
    /*
      **El test que evitó una pista de 690 metros.** `pistasDesdeMadhel` vuelve a leer
      esta cadena para estimar rumbo y largo cuando no hay medición, y su regex busca de
      tres a cinco dígitos: contra `1.690x30` enganchaba `690x30`. Se cruzan las dos
      funciones acá porque el error no se ve mirando ninguna de las dos por separado.
    */
    const texto = textoPista(datosAip("SADF")!.pistas[0]);
    const [pista] = pistasDesdeMadhel([texto], 10);
    expect(pista.le).toBe("05");
    expect(pista.he).toBe("23");
    // 1690 m son 5545 ft. Con el bug daban 2264.
    expect(pista.largoFt).toBe(Math.round(1690 * 3.28084));
  });

  it("todas las pistas del AIP se releen con el largo que dice el AIP", () => {
    for (const icao of icaosConAip()) {
      for (const p of datosAip(icao)!.pistas) {
        const metros = Number(p.dimensiones.split(/[xX×]/)[0].replace(".", ""));
        const [releida] = pistasDesdeMadhel([textoPista(p)], 10);
        expect(releida?.largoFt, `${icao} ${p.designador}`).toBe(Math.round(metros * 3.28084));
      }
    }
  });
});

describe("componerFicha", () => {
  const vacio = { runways: [], radio: [], localization: "", fuel: "", telephone: [] };

  it("el AIP llena lo que MADHEL deja vacío", () => {
    // Es el caso de los ocho controlados: MADHEL contesta todo vacío.
    const f = componerFicha(vacio, datosAip("SADF"));
    expect(f.radio[0]).toContain("119.00 MHz");
    expect(f.runways[0]).toContain("05/23");
    expect(f.fuel).toBe("AVGAS 100LL, JET A-1");
    expect(f.localization).toBe("2 km al SW de la ciudad de San Fernando");
    expect(f.aip?.vigenteDesde).toBe("11-Jun-26");
  });

  it("**MADHEL manda donde publica**, y ése era el bug", () => {
    /*
      La versión anterior hacía `fallback ? fallback.rwy : madhel.rwy`, o sea al revés: el
      dato escrito a mano pisaba al de ANAC. Con eso La Plata mostraba una pista de tierra
      de 1435 m donde MADHEL publica asfalto de 1427, y uno de sus siete teléfonos.
    */
    const deAnac = {
      runways: ["02/20: 1427x45 M - ASPH – AUW 25t/1 33t/2 54t/4"],
      radio: ["COOP 123.50 MHz"],
      localization: "5 KM al SE de la ciudad de LA PLATA",
      fuel: "AVGAS 100LL / JET A-1",
      telephone: ["(0221) 4861568", "(0221) 5032510"],
    };
    // Se le pasa el AIP de San Fernando a propósito: aunque hubiera datos, no deben ganar.
    const f = componerFicha(deAnac, datosAip("SADF"));
    expect(f).toMatchObject({ ...deAnac, aip: null });
  });

  it("se decide campo por campo, no aeródromo por aeródromo", () => {
    /*
      El día que ANAC publique las frecuencias de un controlado en MADHEL, esas ganan y las
      pistas siguen saliendo del AIP, sin que nadie tenga que tocar una lista.
    */
    const f = componerFicha({ ...vacio, radio: ["TWR 119.00 MHz (de MADHEL)"] }, datosAip("SADF"));
    expect(f.radio).toEqual(["TWR 119.00 MHz (de MADHEL)"]);
    expect(f.runways[0]).toContain("05/23");
    // El AIP sigue siendo fuente de las pistas, así que la fecha se muestra igual.
    expect(f.aip).not.toBeNull();
  });

  it("sin AIP no inventa nada", () => {
    const f = componerFicha(vacio, null);
    expect(f).toEqual({ ...vacio, aip: null });
  });

  it("no atribuye al AIP un dato que no salió del AIP", () => {
    // MADHEL contestó todo: la ficha no debe mostrar fecha de vigencia del AIP.
    const completo = {
      runways: ["18/36 1080x30 M"],
      radio: ["COOP 123.50 MHz"],
      localization: "3 KM al SO",
      fuel: "AVGAS 100LL",
      telephone: [],
    };
    expect(componerFicha(completo, datosAip("SADF")).aip).toBeNull();
  });

  it("los teléfonos nunca los pone el AIP", () => {
    expect(componerFicha(vacio, datosAip("SADF")).telephone).toEqual([]);
  });
});
