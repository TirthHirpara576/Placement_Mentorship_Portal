const token = localStorage.getItem("token");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const dashboardBtn = document.getElementById("dashboardBtn");
const menuBtn = document.getElementById("menuBtn");

if (token) {
    loginBtn?.classList.add("d-none");
    logoutBtn?.classList.remove("d-none");
    dashboardBtn?.classList.remove("d-none");
    menuBtn?.classList.remove("d-none");
}

dashboardBtn?.addEventListener("click", () => {
    window.location.href = "/coordinator/dashboard.html";
});

logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
});