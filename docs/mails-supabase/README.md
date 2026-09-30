# Los mails de Supabase Auth

**Generados por `npm run build:mails-auth` desde `src/lib/mails-auth.ts`: no se editan a mano.**
Supabase los manda con la plantilla que tenga cargada en su panel, así que después de
cambiarlos hay que pegarlos de nuevo.

Dónde: [Authentication → Emails](https://supabase.com/dashboard/project/jkmcdbihjqkgizekzlun/auth/templates),
proyecto "Vector SA".

| Plantilla del panel | Subject | Message body |
|---|---|---|
| Confirm sign up | Confirmá tu mail para entrar a Vector | `confirmar-cuenta.html` |
| Reset password | Elegí una contraseña nueva para Vector | `recuperar-contrasena.html` |

El link de cada mail es `{{ .ConfirmationURL }}`, la variable de Supabase: no cambiarlo.

**Si el panel no deja editar las plantillas,** puede pedir un SMTP propio antes (no se
verificó en qué plan lo exige). Sirve el de Resend, que ya manda los otros mails:
*Authentication → Emails → SMTP Settings*, host `smtp.resend.com`, puerto `465`,
usuario `resend`, contraseña una API key de Resend, y el mismo remitente de
`RESEND_FROM` (con el dominio verificado en Resend).
