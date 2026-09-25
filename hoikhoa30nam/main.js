import {
  login,
  logout,
  getUserProfile,
  watchAuth,
} from "./firebase/auth.js";

/* ========================================
   MENU MOBILE
======================================== */

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("show");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

/* ========================================
   TAB NAVIGATION
======================================== */

const tabLinks = document.querySelectorAll(".tab-link");
const tabContents = document.querySelectorAll(".tab-content");

function openTab(tabId) {
  tabContents.forEach((content) => {
    content.classList.remove("active");
    content.style.display = "none";
  });

  tabLinks.forEach((link) => {
    link.classList.remove("active");
  });

  const selectedTab = document.getElementById(tabId);

  if (!selectedTab) {
    console.error(`Không tìm thấy tab có id="${tabId}"`);
    return;
  }

  selectedTab.classList.add("active");
  selectedTab.style.display = "block";

  const selectedLink = document.querySelector(
    `.tab-link[data-tab="${tabId}"]`,
  );

  if (selectedLink) {
    selectedLink.classList.add("active");
  }

  navMenu.classList.remove("show");
  menuToggle.setAttribute("aria-expanded", "false");

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }

  const mainNav = document.querySelector(".main-nav");

  if (mainNav) {
    window.scrollTo({
      top: mainNav.offsetTop,
      behavior: "smooth",
    });
  }
}

tabLinks.forEach((link) => {
  link.addEventListener("click", () => {
    openTab(link.dataset.tab);
  });
});

document.addEventListener("click", (event) => {
  const clickedInsideMenu =
    navMenu.contains(event.target) || menuToggle.contains(event.target);

  if (!clickedInsideMenu) {
    navMenu.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

/* ========================================
   DOM AUTH / MANAGEMENT
======================================== */

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const loginMenuItem = document.getElementById("loginMenuItem");
const managementMenuItem = document.getElementById("managementMenuItem");
const managementTabButton = document.getElementById("managementTabButton");

const managementTitle = document.getElementById("managementTitle");
const managementSubtitle = document.getElementById("managementSubtitle");
const currentUserName = document.getElementById("currentUserName");
const currentUserEmail = document.getElementById("currentUserEmail");
const currentUserRole = document.getElementById("currentUserRole");
const logoutButton = document.getElementById("logoutButton");

let currentSession = null;

function setLoginMessage(message = "", type = "") {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.className = "login-message";

  if (type) {
    loginMessage.classList.add(type);
  }
}

function showLoggedOutUI() {
  currentSession = null;

  loginMenuItem.classList.remove("hidden");
  managementMenuItem.classList.add("hidden");

  managementTabButton.textContent = "Quản lý";

  currentUserName.textContent = "-";
  currentUserEmail.textContent = "-";
  currentUserRole.textContent = "-";
}

function showLoggedInUI(session) {
  const { authUser, profile } = session;

  currentSession = session;

  loginMenuItem.classList.add("hidden");
  managementMenuItem.classList.remove("hidden");

  currentUserName.textContent = profile.name || "Người dùng";
  currentUserEmail.textContent =
    profile.email || authUser.email || "-";

  if (profile.role === "class_editor") {
    const classId = profile.classId || "";

    managementTabButton.textContent = classId
      ? `Quản lý lớp ${classId}`
      : "Quản lý lớp";

    managementTitle.textContent = classId
      ? `Quản lý lớp ${classId}`
      : "Quản lý lớp";

    managementSubtitle.textContent = classId
      ? `Nhập và cập nhật dữ liệu của lớp ${classId}`
      : "Nhập và cập nhật dữ liệu lớp phụ trách";

    currentUserRole.textContent = classId
      ? `Đại diện lớp ${classId}`
      : "Đại diện lớp";
  } else if (profile.role === "admin") {
    managementTabButton.textContent = "Quản trị";
    managementTitle.textContent = "Quản trị Hội khóa";
    managementSubtitle.textContent = "Quản lý dữ liệu của toàn khóa";
    currentUserRole.textContent = "Ban Tổ chức / Admin";
  } else {
    managementTabButton.textContent = "Quản lý";
    managementTitle.textContent = "Quản lý dữ liệu";
    managementSubtitle.textContent = "Tài khoản đã đăng nhập";
    currentUserRole.textContent = profile.role || "Người dùng";
  }

  openTab("management");
}

/* ========================================
   ĐĂNG NHẬP
======================================== */

if (loginButton) {
  loginButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setLoginMessage(
        "Vui lòng nhập đầy đủ email và mật khẩu.",
        "error",
      );
      return;
    }

    try {
      loginButton.disabled = true;
      loginButton.textContent = "Đang đăng nhập...";
      setLoginMessage("");

      /*
       * Quan trọng:
       * Không chỉ chờ onAuthStateChanged.
       * Nếu trình duyệt đã giữ phiên đăng nhập của đúng tài khoản,
       * signInWithEmailAndPassword có thể không tạo ra một lần đổi trạng thái
       * mới đủ để điều hướng lại giao diện.
       *
       * Vì vậy sau login ta lấy profile ngay và chuyển màn hình trực tiếp.
       */
      const authUser = await login(email, password);
      const profile = await getUserProfile(authUser.uid);

      if (!profile) {
        throw new Error("Không tìm thấy hồ sơ người dùng trong Firestore/users.");
      }

      if (profile.active === false) {
        await logout();
        throw new Error("Tài khoản đang bị khóa.");
      }

      showLoggedInUI({
        authUser,
        profile,
      });

      setLoginMessage("Đăng nhập thành công.", "success");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      setLoginMessage(
        error.message ||
          "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.",
        "error",
      );
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Đăng nhập";
    }
  });
}

if (passwordInput) {
  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loginButton.click();
    }
  });
}

/* ========================================
   THEO DÕI PHIÊN FIREBASE
======================================== */

watchAuth((session) => {
  if (!session) {
    console.log("Chưa đăng nhập");
    showLoggedOutUI();
    return;
  }

  const profile = session.profile;

  if (!profile) {
    console.warn("Tài khoản chưa có hồ sơ trong Firestore/users.");
    showLoggedOutUI();
    return;
  }

  if (profile.active === false) {
    console.warn("Tài khoản đang bị khóa.");
    logout();
    showLoggedOutUI();
    return;
  }

  console.log("Đã đăng nhập:", profile);

  if (profile.role === "class_editor") {
    console.log("Lớp phụ trách:", profile.classId);
  }

  /*
   * Khi tải lại trang mà Firebase còn giữ phiên đăng nhập,
   * tự động đưa người dùng về màn hình quản lý.
   */
  showLoggedInUI(session);
});

/* ========================================
   ĐĂNG XUẤT
======================================== */

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await logout();

      emailInput.value = "";
      passwordInput.value = "";

      setLoginMessage("");
      showLoggedOutUI();
      openTab("home");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  });
}
