import type { Metadata } from "next";
import LegalShell from "../LegalShell";
import CambiarConsentimientoMeta from "@/components/publico/CambiarConsentimientoMeta";

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
    <LegalShell title="Política de Privacidad" updated="6 de octubre de 2026">
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
          <li>
            <strong>Los mails que te mandamos:</strong> qué mail te llegó y cuándo, si lo
            abriste y qué links tocaste. Lo medimos nosotros, con una imagen que se carga al
            abrir el mail y con los links, que pasan por Vector antes de llevarte a destino.
            De cada link guardamos a dónde iba (la pantalla de Vector o el sitio de afuera),
            no la dirección completa. Si tu correo bloquea las imágenes, la apertura no se
            registra; y si preferís que no quede registro de los links, podés copiar la
            dirección de destino en vez de tocarlos. El link para darte de baja no se mide.
          </li>
        </ul>
      </section>

      <section>
        <h2>Dónde se guardan</h2>
        <p>
          En una base de datos gestionada por <strong>Supabase</strong>. Cada usuario sólo
          puede leer y escribir sus propios registros: la base aplica reglas de acceso por
          fila, no depende de que la aplicación se acuerde de filtrar. La única excepción es
          tu perfil en la red y lo que publiques en ella (ver abajo).
          Las fotos de la red se guardan en el almacenamiento de archivos del mismo
          proveedor.
        </p>
      </section>

      <section>
        <h2>Perfil público y red de pilotos</h2>
        <p>
          Elegir tu @ es parte del alta: sin él no se termina de crear la cuenta. Al elegirlo
          decidís si tu perfil es <strong>público o privado</strong> —en el alta arranca
          privado— y lo podés cambiar cuando quieras desde el Hangar. Esto es lo que se
          publica:
        </p>
        <ul>
          <li>
            <strong>Siempre visibles para cualquiera</strong>, con o sin cuenta en Vector y
            aunque tu perfil sea privado: tu @, el nombre que elijas mostrar (no tiene que ser
            el tuyo), tu licencia, tu bio y tu foto de perfil si las cargás, y cuántos
            seguidores tenés y a cuántos pilotos seguís.
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
            <strong>Resend</strong> — el envío de los mails (el briefing del vuelo, el de
            bienvenida, el resumen del mes, las novedades y los de tu cuenta: confirmar el
            mail y recuperar la contraseña). Implica compartir tu correo y el contenido del
            mensaje.
          </li>
          <li>
            <strong>El servicio de avisos de tu navegador</strong> (Google, Apple o Mozilla,
            según cuál uses) — sólo si activás los avisos push. El aviso viaja cifrado de
            punta a punta: ese servicio lo entrega, pero no puede leerlo.
          </li>
          <li>
            <strong>Meta</strong> (Facebook e Instagram) — sólo si aceptás el píxel en la
            portada o las guías. Ver <a href="#meta">Medición de anuncios</a>.
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
          <li>
            Mandarte por mail el briefing del vuelo que programaste y, una sola vez en los días
            siguientes a crear tu cuenta, cómo cargar tu primer vuelo si todavía no lo hiciste.
          </li>
          <li>
            Mandarte por mail, el primer día de cada mes, un resumen del mes anterior: horas,
            aterrizajes, lo que te falta para la próxima licencia, tu saldo y si tu CMA está
            por vencer. Te llega si cargaste al menos un vuelo, y te das de baja con el link
            que trae cada mail.
          </li>
          <li>
            Mandarte por mail, de vez en cuando, las novedades de Vector. Te llegan si tenés
            una cuenta con el mail confirmado, y te das de baja con el link que trae cada
            mail. Darte de baja de las novedades no te saca del resumen del mes, ni al revés.
          </li>
          <li>
            Saber si los mails sirven: cuántos se abren y qué links se tocan, para mejorarlos
            y para detectar si están cayendo en spam. Lo vemos en conjunto y por cuenta, y
            no lo compartimos con nadie.
          </li>
          <li>Responder tus consultas cuando usás el copiloto.</li>
          <li>Detectar inconsistencias en tu libro (superposiciones, duplicados).</li>
        </ul>
        <p>
          No usamos tus datos de vuelo para entrenar modelos ni para elaborar perfiles con
          fines comerciales.
        </p>
      </section>

      <section id="meta">
        <h2>Medición de anuncios (píxel de Meta)</h2>
        <p>
          Vector publica anuncios en Instagram y Facebook. Para saber si funcionan usamos el
          píxel de Meta, y <strong>sólo si lo aceptás</strong> en el cartel que aparece la
          primera vez. Si no elegís o decís que no, no se carga.
        </p>
        <ul>
          <li>
            <strong>Dónde:</strong> sólo en la portada y en las guías, y al terminar el
            registro. Nunca adentro de la app, ni en el perfil público de un piloto, ni en las
            pantallas de ingreso.
          </li>
          <li>
            <strong>Qué le llega a Meta:</strong> que visitaste esa página o que creaste una
            cuenta, junto con lo que el navegador le manda a cualquier sitio (dirección IP, tipo
            de navegador) y las cookies de Meta, que le permiten relacionarlo con tu cuenta de
            Facebook o Instagram si tenés una. No le mandamos tu mail, tus vuelos ni ningún dato
            de tu bitácora, y la carga automática de datos de la página está apagada.
          </li>
          <li>
            <strong>Para qué:</strong> medir cuántas personas llegan desde un anuncio y se
            registran, y mostrarle los anuncios a gente parecida. Meta trata esos datos según su
            propia política de privacidad.
          </li>
        </ul>
        <p>Tu elección queda guardada en este navegador, y la podés cambiar cuando quieras:</p>
        <CambiarConsentimientoMeta />
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
