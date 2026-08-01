/**
 * Nothing in the modal slot for routes that aren't intercepted.
 *
 * Required by Next: without a `default.tsx` a hard navigation to any dashboard
 * route that the slot doesn't match would 404 the whole segment.
 */
export default function DefaultModal() {
  return null;
}
