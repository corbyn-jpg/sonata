// In the browser the key lives in local storage, which is less protected than the phone's secure storage: the
// records are still encrypted before they're stored or uploaded, but the key sits beside them in this browser.

export const readKey = async (name: string) => localStorage.getItem(name);

export const writeKey = async (name: string, hex: string) => localStorage.setItem(name, hex);

export const deleteKey = async (name: string) => localStorage.removeItem(name);
