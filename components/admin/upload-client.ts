export async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Could not read image dimensions"));
      image.src = url;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function uploadAdminFile(file: File, onProgress?: (progress: number) => void, signal?: AbortSignal) {
  return new Promise<{ objectKey: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-Upload-Filename", encodeURIComponent(file.name));
    xhr.setRequestHeader("X-Upload-Size", String(file.size));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const responseText = xhr.responseText?.trim();
      let data: { objectKey?: string; error?: string } = {};
      try {
        data = JSON.parse(responseText || "{}") as typeof data;
      } catch {
        reject(new Error(`Upload failed (${xhr.status || "network"})`));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.objectKey) {
        resolve({ objectKey: data.objectKey });
        return;
      }
      reject(new Error(data.error ?? `Upload failed (${xhr.status || "network"})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
