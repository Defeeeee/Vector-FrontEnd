import { NextResponse, type NextRequest } from "next/server";
import { getSessionToken } from "@/actions/auth";
import { apiFetch } from "@/lib/api";
import { esAlumno, vuelosDesdeLaPpa } from "@/lib/licencias";
import { apellidoYNombre, armarLibro, fechaDeGeneracion, renglonesDeLaHoja, valoresDeApertura } from "@/lib/libro-anac";
import { pdfDelLibro } from "@/lib/libro-anac-pdf";
import type { Aircraft, Flight, Logbook, Profile } from "@/types";

export const runtime = "nodejs";

/**
 * El libro de vuelo en PDF, con la hoja de siempre: un "libro de vuelo en formato digital
 * impreso", como lo admite la Res. ANAC 470/2025 (Anexo I, 9(b)). Ver `lib/libro-anac.ts`
 * para qué va en cada casillero.
 *
 * - **Pide sesión**: es la bitácora entera de una persona.
 * - **Un libro por PDF.** Quien lleva más de uno en Vector elige cuál con `?libro=<id>`;
 *   sin elegir, el principal. Un vuelo sin libro asignado es del principal. Las horas de
 *   apertura de ese libro son los "Totales página anterior" de la primera hoja.
 * - Se arma con lo que el backend ya devuelve (`/flights`, `/aircraft`, `/logbooks`,
 *   `/profiles`): el PDF no inventa nada que Vector no tenga, y lo que falta —la potencia
 *   de un avión, el legajo— queda en blanco para completar a mano.
 */
export async function GET(req: NextRequest) {
  if (!(await getSessionToken())) {
    return NextResponse.json({ error: "Tu sesión venció. Volvé a entrar." }, { status: 401 });
  }

  const [perfilesRes, vuelosRes, avionesRes, librosRes] = await Promise.all([
    apiFetch("/profiles", { cache: "no-store" }),
    apiFetch("/flights", { cache: "no-store" }),
    apiFetch("/aircraft", { cache: "no-store" }),
    apiFetch("/logbooks", { cache: "no-store" }),
  ]);
  if ([perfilesRes, vuelosRes, avionesRes, librosRes].some((r) => r.status === 401)) {
    return NextResponse.json({ error: "Tu sesión venció. Volvé a entrar." }, { status: 401 });
  }
  if (![perfilesRes, vuelosRes, avionesRes, librosRes].every((r) => r.ok)) {
    // Un libro al que le falta una parte no se entrega: sería un documento que se
    // presenta ante ANAC con horas de menos.
    return NextResponse.json(
      { error: "No se pudo armar el libro: faltó una parte de tus datos. Probá de nuevo en un momento." },
      { status: 502 }
    );
  }

  const perfil = ((await perfilesRes.json()) as Profile[])[0] ?? null;
  // El alumno piloto no tiene libro de vuelo (Federico, 2026-09-24): ver `lib/licencias.ts`.
  if (esAlumno(perfil?.license_type)) {
    return NextResponse.json({ error: "Como alumno piloto no llevás libro de vuelo." }, { status: 404 });
  }
  // Las horas de alumno no van al libro: arranca el día que rindió la PPA. Sin fecha
  // —quien nunca fue alumno en Vector—, van todos los vuelos, como siempre.
  const vuelos = vuelosDesdeLaPpa((await vuelosRes.json()) as Flight[], perfil?.fecha_ppa);
  const aeronaves = (await avionesRes.json()) as Aircraft[];
  const libros = (await librosRes.json()) as Logbook[];

  const principal = libros.find((l) => l.is_default) ?? libros[0] ?? null;
  const pedido = req.nextUrl.searchParams.get("libro");
  const libro = libros.find((l) => l.id === pedido) ?? principal;
  const delLibro =
    libros.length <= 1 || !libro ? vuelos : vuelos.filter((f) => (f.logbook_id ?? principal?.id) === libro.id);

  const apertura = valoresDeApertura(libro);
  // Cada libro corta la hoja donde la corta el de papel (Hangar → Libros de vuelo).
  const renglonesPorHoja = renglonesDeLaHoja(libro);
  const hojas = armarLibro({ vuelos: delLibro, aeronaves, apertura, renglonesPorHoja });
  const ahora = new Date();
  const bytes = await pdfDelLibro(
    hojas,
    {
      apellidoYNombre: apellidoYNombre(perfil?.first_name, perfil?.last_name),
      licencia: perfil?.license_type && perfil.license_type !== "-" ? perfil.license_type : "",
      licenciaNumero: perfil?.licencia_numero ?? "",
      legajo: perfil?.legajo ?? "",
      libro: libros.length > 1 ? libro?.name : undefined,
    },
    { generado: fechaDeGeneracion(ahora), apertura, renglonesPorHoja }
  );

  const apellido = (perfil?.last_name ?? "piloto")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const archivo = `libro-de-vuelo-${apellido || "piloto"}-${ahora.toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
