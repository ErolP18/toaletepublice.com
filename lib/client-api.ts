import { adminHref } from "@/lib/admin-path";

export async function readApi<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Răspuns invalid de la server.");
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : "Nu am putut vorbi cu serverul.";
    throw new Error(message);
  }
  if (data == null) throw new Error("Răspuns gol de la server.");
  return data as T;
}

export async function logoutAdmin() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = adminHref("/login");
}
