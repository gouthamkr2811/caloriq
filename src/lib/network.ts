/**
 * Checks real internet connectivity by pinging a reliable URL.
 * Firestore's WebSocket can report "offline" inside Expo Go even when the device
 * has internet — this bypasses that by doing a direct HTTP check.
 */
export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      // Short timeout so we don't block the UI for long
      signal: AbortSignal.timeout(3000),
    });
    return response.status === 204 || response.ok;
  } catch {
    return false;
  }
}
