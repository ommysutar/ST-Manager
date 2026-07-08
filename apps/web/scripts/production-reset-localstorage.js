/**
 * Paste into the browser console while signed in on the ST Manager web app.
 * Clears operational localStorage only — keeps studio profile, services, slots, WhatsApp templates, and cloud config.
 */
(function productionResetLocalStorage() {
  const KEEP = new Set([
    "st-manager-studio-profile",
    "st-manager-service-pricing",
    "st-manager-booking-slots",
    "st-manager-studios",
    "st-manager-whatsapp-settings",
    "st-manager-cloud-config",
    "st-manager.accessToken",
    "st-manager.refreshToken",
    "st-manager.user",
  ]);

  const PURGE_PREFIXES = ["st-manager-"];
  const removed = [];

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) {
      continue;
    }

    const isOperational =
      PURGE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !KEEP.has(key);

    if (isOperational) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  }

  console.log("ST Manager production localStorage reset complete.");
  console.log("Removed:", removed.length ? removed : "(none)");
  console.log("Kept configuration keys:", [...KEEP]);
  console.log("Reload the page to see an empty dashboard.");
})();
