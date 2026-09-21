export function uploadAdminFile(file: File, onProgress?: (progress: number) => void, signal?: AbortSignal) {
  return new Promise<{ objectKey: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-Filename", file.name);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 80));
    };
    xhr.onload = () => {
      let data: { objectKey?: string; error?: string } = {};
      try { data = JSON.parse(xhr.responseText) as typeof data; } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.objectKey) {
        resolve({ objectKey: data.objectKey });
      } else {
        reject(new Error(data.error ?? "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
