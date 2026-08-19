import { auth, db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const els = {
  body: document.querySelector("#householdBody"),
  search: document.querySelector("#searchInput"),
  village: document.querySelector("#villageFilter"),
  status: document.querySelector("#statusFilter"),
  clear: document.querySelector("#clearFilters"),
  logout: document.querySelector("#logoutBtn"),
  empty: document.querySelector("#emptyState"),
  totalHouseholds: document.querySelector("#totalHouseholds"),
  totalPopulation: document.querySelector("#totalPopulation"),
  totalVillages: document.querySelector("#totalVillages"),
  totalFlooded: document.querySelector("#totalFlooded")
};

let allHouseholds = [];
let unsubscribe = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  startRealtimeData();
});

function startRealtimeData() {
  if (unsubscribe) unsubscribe();
  const q = query(collection(db, "households"), orderBy("headName"));
  unsubscribe = onSnapshot(q, (snapshot) => {
    allHouseholds = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    rebuildVillageFilter();
    render();
  }, (error) => {
    console.error(error);
    els.empty.classList.remove("hidden");
    els.empty.textContent = "Không tải được dữ liệu. Kiểm tra Firestore Rules và kết nối mạng.";
  });
}

function norm(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function rebuildVillageFilter() {
  const current = els.village.value;
  const villages = [...new Set(allHouseholds.map(x => x.village).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "vi"));
  els.village.innerHTML = '<option value="">Tất cả</option>' +
    villages.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if (villages.includes(current)) els.village.value = current;
}

function getFiltered() {
  const search = norm(els.search.value);
  const village = els.village.value;
  const status = els.status.value;

  return allHouseholds.filter((item) => {
    const matchesSearch = !search || norm(item.headName).includes(search);
    const matchesVillage = !village || item.village === village;
    const isActive = item.active !== false;
    const matchesStatus = status === "all" ||
      (status === "active" && isActive) ||
      (status === "inactive" && !isActive);
    return matchesSearch && matchesVillage && matchesStatus;
  });
}

function render() {
  const data = getFiltered();
  els.body.innerHTML = data.map((item, index) => `
    <tr class="${item.active === false ? "inactive-row" : ""}">
      <td>${index + 1}</td>
      <td class="name-cell">${escapeHtml(item.headName || "")}</td>
      <td>${escapeHtml(item.permanentResidence || item.commune || "")}</td>
      <td>${escapeHtml(item.detailAddress || item.village || "")}</td>
      <td class="num">${Number(item.population || 0)}</td>
      <td>${formatFlag(item.floodedFloor)}</td>
      <td>${formatFlag(item.floodedRoof)}</td>
      <td class="source">${escapeHtml(item.sourceFile || "")}</td>
    </tr>
  `).join("");

  els.empty.classList.toggle("hidden", data.length > 0);
  updateStats(data);
}

function updateStats(data) {
  els.totalHouseholds.textContent = data.length.toLocaleString("vi-VN");
  els.totalPopulation.textContent = data.reduce((sum, x) => sum + Number(x.population || 0), 0).toLocaleString("vi-VN");
  els.totalVillages.textContent = new Set(data.map(x => x.village).filter(Boolean)).size.toLocaleString("vi-VN");
  els.totalFlooded.textContent = data.filter(x => truthyFlag(x.floodedFloor) || truthyFlag(x.floodedRoof)).length.toLocaleString("vi-VN");
}

function truthyFlag(v) {
  if (v === true) return true;
  const s = norm(v);
  return ["x", "co", "1", "yes", "true"].includes(s);
}

function formatFlag(v) {
  return truthyFlag(v) ? "Có" : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

[els.search, els.village, els.status].forEach(el => el.addEventListener("input", render));
els.clear.addEventListener("click", () => {
  els.search.value = "";
  els.village.value = "";
  els.status.value = "active";
  render();
});
els.logout.addEventListener("click", () => signOut(auth));
