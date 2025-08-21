/* =========================================================
   js/api.js  ·  Minimal helper for your static dashboard
   Compatible with backend operateController (name/payload)
========================================================= */

/* ---------- 0. Persist JWT from ?token=xyz ---------- */
(function persistToken() {
  const url   = new URL(window.location.href);
  const token = url.searchParams.get("token");
  if (token) {
    localStorage.setItem("jwt", token);
    url.searchParams.delete("token");
    history.replaceState({}, "", url.pathname);   // clean the URL bar
  }
})();

/* ---------- 1. Globals ---------- */
const API      = "http://localhost:5000/api/operate";
let   jwtToken = localStorage.getItem("jwt");

const statusEl  = document.getElementById("status");
const profileEl = document.getElementById("profileBox");
const jobEl     = document.getElementById("jobList");

/* ---------- 2. Generic /operate wrapper ---------- */
async function operate(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

/* ---------- 3. Load profile on page load ---------- */
(async function init() {
  statusEl.textContent = jwtToken ? "🔒 Authenticated" : "❌ Not authenticated";
  if (!jwtToken) return;

  const data = await operate({ name: "getUser", payload: {} });
  profileEl.textContent = JSON.stringify(data, null, 2);
})();

/* ---------- 4. Update profile quick‑form ---------- */
document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!jwtToken) return alert("Login first!");

  const fd = new FormData(e.target);
  const payload = {
    "profile.resumeHeadline": fd.get("resumeHeadline"),
    "profile.location": fd.get("location"),
    "profile.skills": fd.get("skills")
  };

  const result = await operate({ name: "updateUserProfile", payload });
  alert("Updated!");
  profileEl.textContent = JSON.stringify(result, null, 2);
});

/* ---------- 5. Create job ---------- */
document.getElementById("createJobForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!jwtToken) return alert("Login first!");

  const fd   = new FormData(e.target);
  const job  = Object.fromEntries(fd.entries());

  const res = await operate({ name: "createJob", payload: job });
  alert(JSON.stringify(res, null, 2));
});

/* ---------- 6. Refresh job list ---------- */
document.getElementById("refreshJobs")?.addEventListener("click", async () => {
  const jobs = await operate({ name: "listJobs", payload: {} });
  jobEl.textContent = JSON.stringify(jobs, null, 2);
});

/* ---------- 7. Logout ---------- */
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("jwt");
  jwtToken = null;
  window.location.href = "index.html";
});
