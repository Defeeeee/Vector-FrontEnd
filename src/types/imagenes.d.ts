/**
 * Los tipos de una imagen importada como módulo (`import fondo from "./x.jpg"`).
 *
 * Next los declara en `next-env.d.ts`, pero ese archivo se genera en el build y está en
 * el `.gitignore`: en el CI, `tsc` corre antes del build y no lo encuentra. Esta copia
 * mínima es la que usa `PlanDeVueloOaci.tsx` para el formulario de EANA.
 */
declare module "*.jpg" {
  const imagen: { src: string; width: number; height: number; blurDataURL?: string };
  export default imagen;
}
