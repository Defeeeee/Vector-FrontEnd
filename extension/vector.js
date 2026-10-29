/**
 * Vector → CAD, en Vector: le avisa a la página que la extensión está instalada, para que
 * "Pasar al CAD" muestre "Abrí el CAD y tocá Pasar con Vector" en vez de los pasos del
 * marcador (`ExtensionCad.tsx`). No lee nada de la página.
 */
document.documentElement.dataset.vectorCadExtension = chrome.runtime.getManifest().version;
