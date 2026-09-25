import {
  login,
  logout,
  getUserProfile,
  watchAuth,
} from "./firebase/auth.js";

import {
  addMember,
  updateMember,
  deleteMember,
  subscribeMembersByClass,
} from "./firebase/firestore.js";

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("show");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

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
    history.replaceState(
      null,
      "",
      window.location.pathname,
    );
  }

  const mainNav =
    document.querySelector(".main-nav");

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
    navMenu.contains(event.target) ||
    menuToggle.contains(event.target);

  if (!clickedInsideMenu) {
    navMenu.classList.remove("show");
    menuToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }
});

const emailInput =
  document.getElementById("email");
const passwordInput =
  document.getElementById("password");
const loginButton =
  document.getElementById("loginButton");
const loginMessage =
  document.getElementById("loginMessage");

const loginMenuItem =
  document.getElementById("loginMenuItem");
const managementMenuItem =
  document.getElementById("managementMenuItem");
const managementTabButton =
  document.getElementById("managementTabButton");

const managementTitle =
  document.getElementById("managementTitle");
const managementSubtitle =
  document.getElementById("managementSubtitle");
const currentUserName =
  document.getElementById("currentUserName");
const currentUserEmail =
  document.getElementById("currentUserEmail");
const currentUserRole =
  document.getElementById("currentUserRole");
const logoutButton =
  document.getElementById("logoutButton");

const memberSectionTitle =
  document.getElementById("memberSectionTitle");
const memberCount =
  document.getElementById("memberCount");
const memberForm =
  document.getElementById("memberForm");
const memberFormTitle =
  document.getElementById("memberFormTitle");
const memberIdInput =
  document.getElementById("memberId");
const memberFullNameInput =
  document.getElementById("memberFullName");
const memberPhoneInput =
  document.getElementById("memberPhone");
const memberNoteInput =
  document.getElementById("memberNote");
const saveMemberButton =
  document.getElementById("saveMemberButton");
const cancelEditButton =
  document.getElementById("cancelEditButton");
const memberFormMessage =
  document.getElementById("memberFormMessage");
const memberSearch =
  document.getElementById("memberSearch");
const memberTableBody =
  document.getElementById("memberTableBody");

const comingSoonCards =
  document.querySelectorAll(".coming-soon-card");

let currentSession = null;
let unsubscribeMembers = null;
let classMembers = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoginMessage(
  message = "",
  type = "",
) {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.className = "login-message";

  if (type) {
    loginMessage.classList.add(type);
  }
}

function setMemberMessage(
  message = "",
  type = "",
) {
  if (!memberFormMessage) return;

  memberFormMessage.textContent = message;
  memberFormMessage.className = "form-message";

  if (type) {
    memberFormMessage.classList.add(type);
  }
}

function resetMemberForm() {
  memberIdInput.value = "";
  memberFullNameInput.value = "";
  memberPhoneInput.value = "";
  memberNoteInput.value = "";

  memberFormTitle.textContent =
    "Thêm thành viên";
  saveMemberButton.textContent =
    "Lưu thành viên";

  cancelEditButton.classList.add("hidden");

  setMemberMessage("");
}

function renderMembers() {
  const keyword = (memberSearch.value || "")
    .trim()
    .toLocaleLowerCase("vi");

  const filtered = classMembers.filter(
    (member) => {
      const fullName = (
        member.fullName || ""
      ).toLocaleLowerCase("vi");

      const phone = (
        member.phone || ""
      ).toLocaleLowerCase("vi");

      return (
        !keyword ||
        fullName.includes(keyword) ||
        phone.includes(keyword)
      );
    },
  );

  memberCount.textContent = classMembers.length;

  if (filtered.length === 0) {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">
          ${
            classMembers.length === 0
              ? "Chưa có dữ liệu"
              : "Không tìm thấy thành viên phù hợp"
          }
        </td>
      </tr>
    `;

    return;
  }

  memberTableBody.innerHTML = filtered
    .map(
      (member, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>
              ${escapeHtml(member.fullName || "")}
            </strong>
          </td>
          <td>${escapeHtml(member.phone || "")}</td>
          <td>${escapeHtml(member.note || "")}</td>
          <td>
            <button
              type="button"
              class="table-action-button edit-member-button"
              data-member-id="${member.id}"
            >
              Sửa
            </button>

            <button
              type="button"
              class="table-action-button delete-member-button"
              data-member-id="${member.id}"
            >
              Xóa
            </button>
          </td>
        </tr>
      `,
    )
    .join("");
}

function stopMemberSubscription() {
  if (unsubscribeMembers) {
    unsubscribeMembers();
    unsubscribeMembers = null;
  }

  classMembers = [];
  renderMembers();
}

function startMemberSubscription(classId) {
  stopMemberSubscription();

  memberSectionTitle.textContent =
    `Danh sách thành viên lớp ${classId}`;

  unsubscribeMembers =
    subscribeMembersByClass(
      classId,
      (members) => {
        classMembers = members;
        renderMembers();
      },
      () => {
        setMemberMessage(
          "Không đọc được dữ liệu. Vui lòng kiểm tra Firestore Rules.",
          "error",
        );
      },
    );
}

function showLoggedOutUI() {
  currentSession = null;

  stopMemberSubscription();
  resetMemberForm();

  loginMenuItem.classList.remove("hidden");
  managementMenuItem.classList.add("hidden");

  managementTabButton.textContent =
    "Quản lý";

  currentUserName.textContent = "-";
  currentUserEmail.textContent = "-";
  currentUserRole.textContent = "-";
}

function showLoggedInUI(session) {
  const { authUser, profile } = session;

  currentSession = session;

  loginMenuItem.classList.add("hidden");
  managementMenuItem.classList.remove("hidden");

  currentUserName.textContent =
    profile.name || "Người dùng";

  currentUserEmail.textContent =
    profile.email || authUser.email || "-";

  if (profile.role === "class_editor") {
    const classId = profile.classId || "";

    managementTabButton.textContent =
      classId
        ? `Quản lý lớp ${classId}`
        : "Quản lý lớp";

    managementTitle.textContent =
      classId
        ? `Quản lý lớp ${classId}`
        : "Quản lý lớp";

    managementSubtitle.textContent =
      classId
        ? `Nhập và cập nhật dữ liệu của lớp ${classId}`
        : "Nhập và cập nhật dữ liệu lớp phụ trách";

    currentUserRole.textContent =
      classId
        ? `Đại diện lớp ${classId}`
        : "Đại diện lớp";

    if (classId) {
      startMemberSubscription(classId);
    }
  } else if (profile.role === "admin") {
    managementTabButton.textContent =
      "Quản trị";

    managementTitle.textContent =
      "Quản trị Hội khóa";

    managementSubtitle.textContent =
      "Quản lý dữ liệu của toàn khóa";

    currentUserRole.textContent =
      "Ban Tổ chức / Admin";

    memberSectionTitle.textContent =
      "Danh sách thành viên - phần Admin sẽ hoàn thiện sau";
  }

  openTab("management");
}

if (loginButton) {
  loginButton.addEventListener(
    "click",
    async () => {
      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (!email || !password) {
        setLoginMessage(
          "Vui lòng nhập đầy đủ email và mật khẩu.",
          "error",
        );
        return;
      }

      try {
        loginButton.disabled = true;
        loginButton.textContent =
          "Đang đăng nhập...";

        setLoginMessage("");

        const authUser =
          await login(email, password);

        const profile =
          await getUserProfile(authUser.uid);

        if (!profile) {
          throw new Error(
            "Không tìm thấy hồ sơ người dùng trong Firestore/users.",
          );
        }

        if (profile.active === false) {
          await logout();

          throw new Error(
            "Tài khoản đang bị khóa.",
          );
        }

        showLoggedInUI({
          authUser,
          profile,
        });

        setLoginMessage(
          "Đăng nhập thành công.",
          "success",
        );
      } catch (error) {
        console.error(
          "Lỗi đăng nhập:",
          error,
        );

        setLoginMessage(
          error.message ||
            "Đăng nhập không thành công.",
          "error",
        );
      } finally {
        loginButton.disabled = false;
        loginButton.textContent =
          "Đăng nhập";
      }
    },
  );
}

if (passwordInput) {
  passwordInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        loginButton.click();
      }
    },
  );
}

watchAuth((session) => {
  if (!session) {
    console.log("Chưa đăng nhập");
    showLoggedOutUI();
    return;
  }

  const profile = session.profile;

  if (!profile) {
    console.warn(
      "Tài khoản chưa có hồ sơ trong Firestore/users.",
    );
    showLoggedOutUI();
    return;
  }

  if (profile.active === false) {
    console.warn(
      "Tài khoản đang bị khóa.",
    );
    logout();
    showLoggedOutUI();
    return;
  }

  console.log(
    "Đã đăng nhập:",
    profile,
  );

  showLoggedInUI(session);
});

if (memberForm) {
  memberForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!currentSession?.profile) {
        setMemberMessage(
          "Phiên đăng nhập không hợp lệ.",
          "error",
        );
        return;
      }

      const profile =
        currentSession.profile;

      const authUser =
        currentSession.authUser;

      if (
        profile.role !== "class_editor"
      ) {
        setMemberMessage(
          "Chức năng này hiện dành cho tài khoản đại diện lớp.",
          "error",
        );
        return;
      }

      const fullName =
        memberFullNameInput.value.trim();

      const phone =
        memberPhoneInput.value.trim();

      const note =
        memberNoteInput.value.trim();

      if (!fullName) {
        setMemberMessage(
          "Vui lòng nhập họ và tên.",
          "error",
        );
        memberFullNameInput.focus();
        return;
      }

      try {
        saveMemberButton.disabled = true;

        const memberId =
          memberIdInput.value;

        if (memberId) {
          await updateMember(
            memberId,
            {
              fullName,
              phone,
              note,
            },
          );

          resetMemberForm();

          setMemberMessage(
            "Đã cập nhật thành viên.",
            "success",
          );
        } else {
          await addMember({
            fullName,
            phone,
            note,
            classId: profile.classId,
            createdBy: authUser.uid,
          });

          resetMemberForm();

          setMemberMessage(
            "Đã thêm thành viên.",
            "success",
          );
        }
      } catch (error) {
        console.error(
          "Lỗi lưu thành viên:",
          error,
        );

        setMemberMessage(
          "Không lưu được dữ liệu. Vui lòng kiểm tra Firestore Rules.",
          "error",
        );
      } finally {
        saveMemberButton.disabled = false;
      }
    },
  );
}

if (memberTableBody) {
  memberTableBody.addEventListener(
    "click",
    async (event) => {
      const editButton =
        event.target.closest(
          ".edit-member-button",
        );

      const deleteButton =
        event.target.closest(
          ".delete-member-button",
        );

      if (editButton) {
        const memberId =
          editButton.dataset.memberId;

        const member =
          classMembers.find(
            (item) =>
              item.id === memberId,
          );

        if (!member) return;

        memberIdInput.value =
          member.id;

        memberFullNameInput.value =
          member.fullName || "";

        memberPhoneInput.value =
          member.phone || "";

        memberNoteInput.value =
          member.note || "";

        memberFormTitle.textContent =
          "Sửa thành viên";

        saveMemberButton.textContent =
          "Cập nhật";

        cancelEditButton.classList.remove(
          "hidden",
        );

        memberFullNameInput.focus();
        return;
      }

      if (deleteButton) {
        const memberId =
          deleteButton.dataset.memberId;

        const member =
          classMembers.find(
            (item) =>
              item.id === memberId,
          );

        if (!member) return;

        const confirmed =
          confirm(
            `Bạn có chắc muốn xóa "${member.fullName}" khỏi danh sách không?`,
          );

        if (!confirmed) return;

        try {
          await deleteMember(memberId);

          if (
            memberIdInput.value ===
            memberId
          ) {
            resetMemberForm();
          }
        } catch (error) {
          console.error(
            "Lỗi xóa thành viên:",
            error,
          );

          setMemberMessage(
            "Không xóa được dữ liệu. Vui lòng kiểm tra Firestore Rules.",
            "error",
          );
        }
      }
    },
  );
}

if (cancelEditButton) {
  cancelEditButton.addEventListener(
    "click",
    () => {
      resetMemberForm();
    },
  );
}

if (memberSearch) {
  memberSearch.addEventListener(
    "input",
    () => {
      renderMembers();
    },
  );
}

comingSoonCards.forEach((card) => {
  card.addEventListener("click", () => {
    alert(
      `${card.dataset.soon} sẽ được xây dựng ở bước tiếp theo.`,
    );
  });
});

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    async () => {
      try {
        await logout();

        emailInput.value = "";
        passwordInput.value = "";

        setLoginMessage("");
        showLoggedOutUI();
        openTab("home");
      } catch (error) {
        console.error(
          "Lỗi đăng xuất:",
          error,
        );
      }
    },
  );
}
