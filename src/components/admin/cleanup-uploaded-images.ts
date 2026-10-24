export async function cleanupUploadedImages(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter((path) => path.startsWith("/uploads/")))];
  const results = await Promise.all(uniquePaths.map(async (path) => {
    try {
      const response = await fetch("/api/admin/v1/uploads", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }));
  return results.every(Boolean);
}
