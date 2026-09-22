export interface Dimensiones {
  width: number;
  height: number;
}

export function calcularDimensiones(
  anchoOriginal: number,
  altoOriginal: number,
  maxDimension: number = 1600
): Dimensiones {
  if (anchoOriginal <= maxDimension && altoOriginal <= maxDimension) {
    return { width: anchoOriginal, height: altoOriginal };
  }

  const ratio = anchoOriginal / altoOriginal;
  if (anchoOriginal > altoOriginal) {
    return { width: maxDimension, height: Math.round(maxDimension / ratio) };
  } else {
    return { width: Math.round(maxDimension * ratio), height: maxDimension };
  }
}

export async function comprimirImagen(file: File, maxDimension: number = 1600): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = calcularDimensiones(img.width, img.height, maxDimension);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("No se pudo obtener el contexto 2d del canvas"));
      }

      ctx.drawImage(img, 0, 0, width, height);

      let mimeType = "image/webp";
      let quality = 0.85;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Error al crear el blob de la imagen"));
          }
          
          let finalType = blob.type;
          let ext = ".webp";
          if (finalType === "image/png" || finalType === "image/jpeg") {
            ext = finalType === "image/jpeg" ? ".jpg" : ".png";
          }
          
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ext), {
            type: finalType,
          });
          resolve(newFile);
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar la imagen original"));
    };

    img.src = url;
  });
}
