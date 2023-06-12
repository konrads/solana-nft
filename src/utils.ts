export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function executeBatch<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = Number.MAX_SAFE_INTEGER,
  sleepBetweenBatchesMs: number = 0
): Promise<Result<T>[]> {
  const batches = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    batches.push(tasks.slice(i, i + batchSize));
  }

  return batches.reduce(
    (soFar, currentBatch, currentIndex) =>
      soFar.then(async (results: Result<T>[]) => {
        if (currentIndex > 0) await sleep(sleepBetweenBatchesMs);
        return await Promise.all(
          currentBatch.map((task) =>
            task()
              .then((value): Result<T> => ({ ok: true, value }))
              .catch((error): Result<T> => ({ ok: false, error }))
          )
        ).then(async (batchResults: Result<T>[]) => [
          ...results,
          ...batchResults,
        ]);
      }),
    Promise.resolve([] as Result<T>[])
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toImgType(fileName: string): string {
  const ext = fileName.split(".").pop()!.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    default:
      throw new Error(`Unsupported file type ${ext}`);
  }
}
