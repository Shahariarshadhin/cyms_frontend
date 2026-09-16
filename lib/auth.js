export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("cybms_user"));
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem("cybms_token", token);
  localStorage.setItem("cybms_user", JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem("cybms_token");
  localStorage.removeItem("cybms_user");
  window.location.href = "/login";
}

export function formatBDT(amount) {
  const n = Number(amount || 0);
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}
