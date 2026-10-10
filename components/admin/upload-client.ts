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
    void fetch("/api/admin/upload/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }), signal })
      .then(async (response) => {
        const data = await response.json() as { objectKey?: string; uploadUrl?: string; contentType?: string; error?: string };
        if (!response.ok || !data.objectKey || !data.uploadUrl) throw new Error(data.error ?? "Could not prepare upload");
        return new Promise<{ objectKey: string }>((uploadResolve, uploadReject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", data.uploadUrl!);
          xhr.setRequestHeader("Content-Type", data.contentType ?? file.type);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) uploadResolve({ objectKey: data.objectKey! });
            else uploadReject(new Error("R2 upload failed"));
          };
          xhr.onerror = () => uploadReject(new Error("R2 upload failed"));
          xhr.onabort = () => uploadReject(new Error("Upload cancelled"));
          signal?.addEventListener("abort", () => xhr.abort(), { once: true });
          xhr.send(file);
        });
      })
      .then(resolve)
      .catch(reject);
  });
}
