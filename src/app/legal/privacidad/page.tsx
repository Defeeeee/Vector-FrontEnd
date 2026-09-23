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
 *   - Los plazos concretos de retención.
 *   - Cualquier afirmación sobre jurisdicción.
 *
 * Ver T3.10 en docs/brief/06-plan-post-flightdeck.md.
 *
 * La sección "Perfil público y red de pilotos" (2026-09-22) describe lo que hace el
 * código: qué campos publica `perfiles_publicos` y qué devuelve
 * `GET /publico/pilotos/{handle}` del backend. Desde la 2.20.0 también las
 * publicaciones: el chip del vuelo (`resumen_de_vuelo`), las fotos (`services/imagenes.py`
 * y sus buckets) y quién las ve (el RLS de la migración 019). Si eso cambia, esto cambia.
 *
 * Desde la 2.21.0 (migraciones 020 y 021): el número de licencia y el legajo del libro
 * en PDF, los bloqueos, los reportes y las suscripciones a los avisos push
 * (`services/avisos.py`: qué dice cada aviso, y que nunca lleva datos de la bitácora).
 */
export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de Privacidad" updated="23 de septiembre de 2026">
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
            <strong>Perfil:</strong> nombre, correo electrónico, tipo de licencia y, si los
            cargás, tu número de teléfono, tu número de licencia y tu legajo. Estos dos
            últimos sólo se usan en el encabezado de tu libro de vuelo en PDF, y no se
            publican.
          </li>
          <li>
            <strong>Vuelos:</strong> fecha, ruta, aeródromos, aeronave, horarios, duración,
            aterrizajes y el desglose de horas por categoría ANAC.
          </li>
          <li>
            <strong>Aeronaves:</strong> matrícula, tipo y, opcionalmente, potencia y costo
            por hora.
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
          fila, no depende de que la aplicación se acuerde de filtrar. La única excepción es
          el perfil público y lo que publiques en la red, si decidís crearlo (ver abajo).
          Las fotos de la red se guardan en el almacenamiento de archivos del mismo
          proveedor.
        </p>
      </section>

      <section>
        <h2>Perfil público y red de pilotos</h2>
        <p>
          Es opcional. Sólo existe si elegís un @, y crearlo es aceptar que se publique lo
          siguiente:
        </p>
        <ul>
          <li>
            <strong>Siempre visibles para cualquiera</strong>, con o sin cuenta en Vector: tu
            @, el nombre que elijas mostrar, tu licencia, tu bio, tu foto de perfil si subís
            una, y cuántos seguidores tenés y a cuántos pilotos seguís.
          </li>
          <li>
            <strong>Tus horas agregadas</strong> —totales, PIC, de travesía, de noche y de
            instrumentos— <strong>y lo que publiques</strong>: visibles para cualquiera si tu
            perfil es público, o sólo para los pilotos que aceptes si es privado.
          </li>
        </ul>
        <p>
          <strong>Nada de tu bitácora se publica solo.</strong> Sólo sale lo que vos
          compartís en una publicación: un texto, fotos, y de un vuelo, únicamente los datos
          que elijas —la ruta como origen y destino, la duración, el tipo de avión y la
          fecha—. <strong>La matrícula nunca se publica</strong>, ni tus documentos, horarios
          o cualquier otro dato de tu cuenta. Lo que se publica de un vuelo es una copia:
          editar o borrar el vuelo después no lo cambia. Las horas son las que cargaste vos;
          no son una certificación de ANAC.
        </p>
        <p>
          <strong>Las fotos se procesan antes de guardarse:</strong> se achican y se les
          borran los metadatos (EXIF), incluida la ubicación GPS que guardan los teléfonos.
          Las de tus publicaciones se sirven con enlaces que vencen a las pocas horas y
          sólo se entregan a quien puede ver tu perfil; la foto de perfil es pública, como
          tu @.
        </p>
        <p>
          Los aplausos y comentarios que dejes los ve quien puede ver la publicación. Podés
          borrar tus comentarios, y los que otros dejen en tus publicaciones.
        </p>
        <p>
          <strong>Podés bloquear a un piloto:</strong> deja de ver tu perfil y lo que
          publicás, vos dejás de ver lo suyo, y se cortan los seguimientos entre los dos. No
          se le avisa. Lo desbloqueás desde el Hangar.
        </p>
        <p>
          <strong>Podés reportar</strong> un perfil, una publicación o un comentario. Se
          guarda quién reportó, qué y el motivo, para que lo revise quien administra la red;
          a quien reportaste no se le dice quién fue.
        </p>
        <p>
          <strong>Avisos push, si los activás:</strong> se guarda la dirección de envío que
          te da el navegador de ese dispositivo (no tu número ni tu correo). Los avisos dicen
          quién te siguió, te aplaudió o te comentó, y nunca llevan datos de tu bitácora. Se
          desactivan desde el Hangar, y al cerrar sesión se dan de baja en ese dispositivo.
        </p>
        <p>
          Podés pasar de público a privado, editar o borrar lo publicado, o borrar tu perfil
          cuando quieras desde el Hangar. Borrar el perfil elimina también tus seguidores, a
          quién seguís, tus publicaciones con sus fotos, y tus aplausos y comentarios.
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
            <strong>Supabase</strong> — alojamiento de la base de datos, autenticación y
            las fotos de la red.
          </li>
          <li>
            <strong>El servicio de avisos de tu navegador</strong> (Google, Apple o Mozilla,
            según cuál uses) — sólo si activás los avisos push. El aviso viaja cifrado de
            punta a punta: ese servicio lo entrega, pero no puede leerlo.
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
          <a href="mailto:fdiaznemeth@gmail.com">fdiaznemeth@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}
