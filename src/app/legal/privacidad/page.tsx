import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidad | Vector",
  description: "Qué datos trata Vector, con quién se comparten y qué derechos tenés sobre ellos.",
};

/**
 * BORRADOR TÉCNICO — REQUIERE REVISIÓN HUMANA ANTES DE PUBLICAR.
 *
 * Lo que está acá es verificable contra el código: qué se guarda, dónde y a qué
 * terceros se envía. Eso lo puede escribir un agente porque sale de leer el repo.
 *
 * Lo que NO puede escribir un agente y hay que completar o confirmar:
 *   - La razón social y el domicilio del responsable.
 *   - El correo de contacto real (abajo figura como PLACEHOLDER).
 *   - Los plazos concretos de retención.
 *   - Cualquier afirmación sobre jurisdicción.
 *
 * Ver T3.10 en docs/brief/06-plan-post-flightdeck.md.
 */
export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de Privacidad" updated="4 de agosto de 2026">
      <section>
        <h2>Qué es esto</h2>
        <p>
          Vector es una bitácora de vuelo digital para pilotos. Para funcionar necesita
          guardar el registro de tus vuelos y algunos datos personales. Esta página
          explica cuáles, dónde viven y con quién se comparten.
        </p>
      </section>

      <section>
        <h2>Qué datos tratamos</h2>
        <ul>
          <li>
            <strong>Perfil:</strong> nombre, correo electrónico, tipo de licencia y, si lo
            cargás, tu número de teléfono.
          </li>
          <li>
            <strong>Vuelos:</strong> fecha, ruta, aeródromos, aeronave, horarios, duración,
            aterrizajes y el desglose de horas por categoría ANAC.
          </li>
          <li>
            <strong>Aeronaves:</strong> matrícula, tipo y, opcionalmente, costo por hora.
          </li>
          <li>
            <strong>Documentación:</strong> tipo de documento, nombre y fecha de
            vencimiento. Esto incluye el <strong>Certificado Médico Aeronáutico</strong>,
            que es un dato de salud y por lo tanto un dato sensible bajo la Ley 25.326.
          </li>
          <li>
            <strong>Saldo y paquetes de horas:</strong> si usás esa función, los
            movimientos que registres.
          </li>
          <li>
            <strong>Conversaciones con el copiloto:</strong> si lo usás por WhatsApp, se
            guarda el historial de la conversación junto a tu número.
          </li>
        </ul>
      </section>

      <section>
        <h2>Dónde se guardan</h2>
        <p>
          En una base de datos gestionada por <strong>Supabase</strong>. Cada usuario sólo
          puede leer y escribir sus propios registros: la base aplica reglas de acceso por
          fila, no depende de que la aplicación se acuerde de filtrar.
        </p>
      </section>

      <section>
        <h2>Con quién se comparten</h2>
        <p>
          No vendemos datos ni los cedemos con fines publicitarios. Se comparten con estos
          proveedores, y sólo para prestar el servicio:
        </p>
        <ul>
          <li>
            <strong>Google (Gemini)</strong> — cuando usás el copiloto, tu consulta y el
            contexto necesario para responderla se envían a la API de Gemini. Ese contexto
            puede incluir datos de tus vuelos, aeronaves y vencimientos.
          </li>
          <li>
            <strong>Kapso / WhatsApp</strong> — para enviarte los avisos de vencimiento y
            para el copiloto por WhatsApp. Implica compartir tu número de teléfono y el
            contenido del mensaje.
          </li>
          <li>
            <strong>Supabase</strong> — alojamiento de la base de datos y autenticación.
          </li>
        </ul>
        <p>
          <strong>Transferencia internacional:</strong> estos proveedores procesan la
          información fuera de la Argentina. Al usar el copiloto o los avisos por WhatsApp
          estás aceptando esa transferencia.
        </p>
      </section>

      <section>
        <h2>Para qué los usamos</h2>
        <ul>
          <li>Llevar tu bitácora y calcular tus horas por categoría.</li>
          <li>Avisarte cuando un documento está por vencer.</li>
          <li>Responder tus consultas cuando usás el copiloto.</li>
          <li>Detectar inconsistencias en tu libro (superposiciones, duplicados).</li>
        </ul>
        <p>
          No usamos tus datos de vuelo para entrenar modelos ni para elaborar perfiles con
          fines comerciales.
        </p>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p>
          Podés acceder a tus datos, rectificarlos y suprimirlos. La mayoría se puede hacer
          desde la propia aplicación: los vuelos, aeronaves y documentos son editables y
          borrables desde tu cuenta. Para el resto, escribinos.
        </p>
        <p>
          La <strong>Agencia de Acceso a la Información Pública</strong> es el organismo de
          control de la Ley 25.326 y tiene la atribución de atender denuncias por
          incumplimientos.
        </p>
      </section>

      <section>
        <h2>Conservación</h2>
        <p>
          Conservamos tus datos mientras tengas cuenta activa. Si la eliminás, se borran los
          registros asociados.
        </p>
      </section>

      <section>
        <h2>Contacto</h2>
        <p>
          Por cualquier consulta sobre tus datos, escribinos a{" "}
          <a href="mailto:PLACEHOLDER@vector.ar">PLACEHOLDER@vector.ar</a>.
        </p>
      </section>
    </LegalShell>
  );
}
