# Los mails de Supabase Auth

**Generados por `npm run build:mails-auth` desde `src/lib/mails-auth.ts`: no se editan a mano.**
Supabase los manda con la plantilla que tenga cargada, así que después de cambiarlos hay
que subirlos de nuevo. Lo más directo es la API:

```bash
SUPABASE_ACCESS_TOKEN=... npm run subir:mails-auth
```

con un token personal de la cuenta de Supabase, que se crea para esto y se borra después.
**Las plantillas sólo se aplican con el SMTP propio activo**, y si se guardaron antes de
activarlo, el servidor de auth puede seguir con las de fábrica hasta que se vuelvan a
guardar (pasó el 2026-09-30).

A mano, también se pueden pegar en el panel:

Dónde: [Authentication → Emails](https://supabase.com/dashboard/project/jkmcdbihjqkgizekzlun/auth/templates),
proyecto "Vector SA".

| Plantilla del panel | Subject | Message body |
|---|---|---|
| Confirm sign up | Confirmá tu mail para Vector | `confirmar-cuenta.html` |
| Reset password | Cambiá tu contraseña | `recuperar-contrasena.html` |

El link de cada mail es `{{ .ConfirmationURL }}`, la variable de Supabase: no cambiarlo.

**Si el panel no deja editar las plantillas,** puede pedir un SMTP propio antes (no se
verificó en qué plan lo exige). Sirve el de Resend, que ya manda los otros mails:
*Authentication → Emails → SMTP Settings*, host `smtp.resend.com`, puerto `465`,
usuario `resend`, contraseña una API key de Resend, y el mismo remitente de
`RESEND_FROM` (con el dominio verificado en Resend).
