import { ensureBucket } from "../lib/minio";

ensureBucket().then(() => {
  console.log(`MinIO bucket ready: ${process.env.MINIO_BUCKET ?? "photography"}`);
}).catch((error) => {
  console.error("Could not create MinIO bucket", error);
  process.exitCode = 1;
});
