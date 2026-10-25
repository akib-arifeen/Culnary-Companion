/**
 * Best-effort clipboard write. Returns false when the browser has no clipboard API or the write is
 * denied (permissions, insecure context, an iframe), so the caller can show the text instead of
 * pretending it copied.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
