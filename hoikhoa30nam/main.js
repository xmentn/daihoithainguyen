import {
  login,
  logout,
  getUserProfile,
  watchAuth,
} from "./firebase/auth.js?v=20260925-2200";

import {
  addMember,
  updateMember,
  deleteMember,
  updateMemberAttendance,
  updateMemberContribution,
  subscribeContributionsByClass,
  migrateLegacyClassData,
  subscribeMembersByClass,
  subscribeAllPublicMembers,
  subscribePublicMembersByClass,
  addSponsor,
  updateSponsor,
  deleteSponsor,
  subscribeSponsorsByClass,
} from "./firebase/firestore.js?v=20260925-2200";

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
const appDialogBackdrop =
  document.getElementById("appDialogBackdrop");
const appDialog =
  document.getElementById("appDialog");
const appDialogIcon =
  document.getElementById("appDialogIcon");
const appDialogTitle =
  document.getElementById("appDialogTitle");
const appDialogMessage =
  document.getElementById("appDialogMessage");
const appDialogCancel =
  document.getElementById("appDialogCancel");
const appDialogConfirm =
  document.getElementById("appDialogConfirm");

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
const manageMembersButton =
  document.getElementById("manageMembersButton");
const manageParticipantsButton =
  document.getElementById("manageParticipantsButton");
const memberManagement =
  document.getElementById("memberManagement");
const participantManagement =
  document.getElementById("participantManagement");
const participantSectionTitle =
  document.getElementById("participantSectionTitle");
const participantTotalCount =
  document.getElementById("participantTotalCount");
const attendingCount =
  document.getElementById("attendingCount");
const participantManageSearch =
  document.getElementById("participantManageSearch");
const participantStatusFilter =
  document.getElementById("participantStatusFilter");
const participantManageTableBody =
  document.getElementById("participantManageTableBody");
const manageContributionsButton =
  document.getElementById("manageContributionsButton");
const contributionManagement =
  document.getElementById("contributionManagement");
const contributionSectionTitle =
  document.getElementById("contributionSectionTitle");
const contributorCount =
  document.getElementById("contributorCount");
const contributionTotal =
  document.getElementById("contributionTotal");
const contributionSearch =
  document.getElementById("contributionSearch");
const contributionFilter =
  document.getElementById("contributionFilter");
const contributionTableBody =
  document.getElementById("contributionTableBody");
const manageSponsorsButton =
  document.getElementById("manageSponsorsButton");
const sponsorManagement =
  document.getElementById("sponsorManagement");
const sponsorSectionTitle =
  document.getElementById("sponsorSectionTitle");
const sponsorCount =
  document.getElementById("sponsorCount");
const sponsorClassTotal =
  document.getElementById("sponsorClassTotal");

const sponsorForm =
  document.getElementById("sponsorForm");
const sponsorFormTitle =
  document.getElementById("sponsorFormTitle");
const sponsorIdInput =
  document.getElementById("sponsorId");
const sponsorNameInput =
  document.getElementById("sponsorName");
const sponsorTypeSelect =
  document.getElementById("sponsorType");
const sponsorAmountGroup =
  document.getElementById("sponsorAmountGroup");
const sponsorAmountInput =
  document.getElementById("sponsorAmount");
const sponsorContentInput =
  document.getElementById("sponsorContent");
const sponsorNoteInput =
  document.getElementById("sponsorNote");
const saveSponsorButton =
  document.getElementById("saveSponsorButton");
const cancelSponsorEditButton =
  document.getElementById("cancelSponsorEditButton");
const sponsorFormMessage =
  document.getElementById("sponsorFormMessage");

const sponsorSearch =
  document.getElementById("sponsorSearch");
const sponsorTypeFilter =
  document.getElementById("sponsorTypeFilter");
const sponsorTableBody =
  document.getElementById("sponsorTableBody");
const publicClassDetail =
  document.getElementById("publicClassDetail");
const publicClassTitle =
  document.getElementById("publicClassTitle");
const publicClassMemberCount =
  document.getElementById("publicClassMemberCount");
const publicClassAttendingCount =
  document.getElementById("publicClassAttendingCount");
const publicClassSponsorTotal =
  document.getElementById("publicClassSponsorTotal");
const publicClassMemberBody =
  document.getElementById("publicClassMemberBody");
const publicClassSponsorBody =
  document.getElementById("publicClassSponsorBody");
const closePublicClassButton =
  document.getElementById("closePublicClassButton");
const publicClassButtons =
  document.querySelectorAll(".public-class-button");
const dashboardClassFilter =
  document.getElementById("dashboardClassFilter");
const dashboardScopeLabel =
  document.getElementById("dashboardScopeLabel");
const dashboardRing =
  document.getElementById("dashboardRing");
const dashboardAttending =
  document.getElementById("dashboardAttending");
const dashboardMembers =
  document.getElementById("dashboardMembers");
const dashboardPercent =
  document.getElementById("dashboardPercent");
const dashboardMemberCard =
  document.getElementById("dashboardMemberCard");
const dashboardAttendingCard =
  document.getElementById("dashboardAttendingCard");
const dashboardPendingCard =
  document.getElementById("dashboardPendingCard");
const dashboardBreakdownTitle =
  document.getElementById("dashboardBreakdownTitle");
const dashboardTableBody =
  document.getElementById("dashboardTableBody");
const totalClassesHome =
  document.getElementById("totalClasses");
const totalParticipantsHome =
  document.getElementById("totalParticipants");
const totalOrganizersHome =
  document.getElementById("totalOrganizers");
const totalSponsorHome =
  document.getElementById("totalSponsor");

const participantSearch =
  document.getElementById("participantSearch");
const participantClassFilter =
  document.getElementById("participantClassFilter");
const participantsTableBody =
  document.getElementById("participantsTableBody");
const publicParticipantCount =
  document.getElementById("publicParticipantCount");

let currentSession = null;
let unsubscribeMembers = null;
let classMembers = [];

let unsubscribeContributions = null;
let classContributions = [];

let unsubscribeSponsors = null;
let classSponsors = [];

let unsubscribePublicMembers = null;
let unsubscribePublicSponsors = null;
let publicClassMembers = [];
let publicClassSponsors = [];
let dashboardMembersData = [];
let unsubscribeDashboard = null;


let activeDialogResolver = null;

function closeAppDialog(result) {
  if (!appDialogBackdrop) return;

  appDialogBackdrop.classList.add("hidden");
  appDialogBackdrop.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialog-open");

  if (activeDialogResolver) {
    activeDialogResolver(result);
    activeDialogResolver = null;
  }
}

function openAppDialog({
  title = "Thông báo",
  message = "",
  type = "info",
  confirmText = "Đồng ý",
  cancelText = "",
  icon = "i",
}) {
  return new Promise((resolve) => {
    activeDialogResolver = resolve;

    appDialog.dataset.type = type;
    appDialogTitle.textContent = title;
    appDialogMessage.textContent = message;
    appDialogIcon.textContent = icon;
    appDialogConfirm.textContent = confirmText;

    if (cancelText) {
      appDialogCancel.textContent = cancelText;
      appDialogCancel.classList.remove("hidden");
    } else {
      appDialogCancel.classList.add("hidden");
    }

    appDialogBackdrop.classList.remove("hidden");
    appDialogBackdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("dialog-open");

    setTimeout(() => {
      appDialogConfirm.focus();
    }, 20);
  });
}

function showConfirmDialog({
  title = "Xác nhận",
  message = "",
  confirmText = "Đồng ý",
  cancelText = "Hủy",
  type = "danger",
}) {
  return openAppDialog({
    title,
    message,
    type,
    confirmText,
    cancelText,
    icon: type === "danger" ? "!" : "?",
  });
}

function showAlertDialog({
  title = "Thông báo",
  message = "",
  type = "info",
  confirmText = "Đã hiểu",
}) {
  return openAppDialog({
    title,
    message,
    type,
    confirmText,
    cancelText: "",
    icon:
      type === "success"
        ? "✓"
        : type === "danger"
          ? "!"
          : "i",
  });
}

if (appDialogConfirm) {
  appDialogConfirm.addEventListener("click", () => {
    closeAppDialog(true);
  });
}

if (appDialogCancel) {
  appDialogCancel.addEventListener("click", () => {
    closeAppDialog(false);
  });
}

if (appDialogBackdrop) {
  appDialogBackdrop.addEventListener("click", (event) => {
    if (event.target === appDialogBackdrop) {
      closeAppDialog(false);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    appDialogBackdrop &&
    !appDialogBackdrop.classList.contains("hidden")
  ) {
    closeAppDialog(false);
  }
});

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
  renderParticipantManagement();
  renderContributionManagement();

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


function stopContributionSubscription() {
  if (unsubscribeContributions) {
    unsubscribeContributions();
    unsubscribeContributions = null;
  }

  classContributions = [];
  renderContributionManagement();
}

function startContributionSubscription(classId) {
  stopContributionSubscription();

  unsubscribeContributions =
    subscribeContributionsByClass(
      classId,
      (items) => {
        classContributions = items;
        renderContributionManagement();
      },
      () => {
        console.error(
          "Không đọc được dữ liệu đóng góp riêng tư.",
        );
      },
    );
}

function startMemberSubscription(classId) {
  stopMemberSubscription();

  memberSectionTitle.textContent =
    `Danh sách thành viên lớp ${classId}`;

  participantSectionTitle.textContent =
    `Danh sách tham gia lớp ${classId}`;

  contributionSectionTitle.textContent =
    `Đóng góp của lớp ${classId}`;

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


function setActiveManagementCard(activeButton) {
  document.querySelectorAll(".management-card").forEach((card) => {
    card.classList.remove("active-management-card");
  });

  if (activeButton) {
    activeButton.classList.add("active-management-card");
  }
}

function showManagementPanel(panelName) {
  memberManagement.classList.add("hidden");
  participantManagement.classList.add("hidden");
  contributionManagement.classList.add("hidden");
  sponsorManagement.classList.add("hidden");

  if (panelName === "participants") {
    participantManagement.classList.remove("hidden");
    setActiveManagementCard(manageParticipantsButton);
  } else if (panelName === "contributions") {
    contributionManagement.classList.remove("hidden");
    setActiveManagementCard(manageContributionsButton);
  } else if (panelName === "sponsors") {
    sponsorManagement.classList.remove("hidden");
    setActiveManagementCard(manageSponsorsButton);
  } else {
    memberManagement.classList.remove("hidden");
    setActiveManagementCard(manageMembersButton);
  }
}

function renderParticipantManagement() {
  const keyword = (participantManageSearch.value || "")
    .trim()
    .toLocaleLowerCase("vi");

  const status = participantStatusFilter.value;

  const filtered = classMembers.filter((member) => {
    const fullName = (member.fullName || "").toLocaleLowerCase("vi");
    const phone = (member.phone || "").toLocaleLowerCase("vi");

    const matchesKeyword =
      !keyword ||
      fullName.includes(keyword) ||
      phone.includes(keyword);

    let matchesStatus = true;

    if (status === "attending") {
      matchesStatus = member.attending === true;
    } else if (status === "not-attending") {
      matchesStatus = member.attending !== true;
    }

    return matchesKeyword && matchesStatus;
  });

  participantTotalCount.textContent = classMembers.length;
  attendingCount.textContent =
    classMembers.filter((member) => member.attending === true).length;

  if (filtered.length === 0) {
    participantManageTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">
          ${classMembers.length === 0
            ? "Chưa có dữ liệu thành viên"
            : "Không tìm thấy thành viên phù hợp"}
        </td>
      </tr>
    `;
    return;
  }

  participantManageTableBody.innerHTML = filtered
    .map((member, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(member.fullName || "")}</strong></td>
        <td>${escapeHtml(member.phone || "")}</td>
        <td>
          <label class="attending-switch">
            <input
              type="checkbox"
              class="attendance-checkbox"
              data-member-id="${member.id}"
              ${member.attending === true ? "checked" : ""}
            >
            <span class="attending-status ${member.attending === true ? "yes" : "no"}">
              ${member.attending === true ? "Đã xác nhận" : "Chưa xác nhận"}
            </span>
          </label>
        </td>
      </tr>
    `)
    .join("");
}


function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(
    Number(amount) || 0,
  ) + " đ";
}

function getContributionAmount(memberId) {
  const item = classContributions.find(
    (row) => row.memberId === memberId || row.id === memberId,
  );

  return Number(item?.amount) || 0;
}

function renderContributionManagement() {
  const keyword = (contributionSearch.value || "")
    .trim()
    .toLocaleLowerCase("vi");

  const filter = contributionFilter.value;

  const filtered = classMembers.filter((member) => {
    const fullName = (member.fullName || "")
      .toLocaleLowerCase("vi");
    const phone = (member.phone || "")
      .toLocaleLowerCase("vi");

    const matchesKeyword =
      !keyword ||
      fullName.includes(keyword) ||
      phone.includes(keyword);

    const amount = getContributionAmount(member.id);

    let matchesFilter = true;

    if (filter === "has") {
      matchesFilter = amount > 0;
    } else if (filter === "none") {
      matchesFilter = amount <= 0;
    }

    return matchesKeyword && matchesFilter;
  });

  const contributors = classMembers.filter(
    (member) => getContributionAmount(member.id) > 0,
  );

  const total = classContributions.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  contributorCount.textContent = contributors.length;
  contributionTotal.textContent = formatCurrency(total);

  if (filtered.length === 0) {
    contributionTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">
          ${
            classMembers.length === 0
              ? "Chưa có dữ liệu thành viên"
              : "Không tìm thấy thành viên phù hợp"
          }
        </td>
      </tr>
    `;
    return;
  }

  contributionTableBody.innerHTML = filtered
    .map((member, index) => {
      const amount = getContributionAmount(member.id);

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(member.fullName || "")}</strong></td>
          <td>${escapeHtml(member.phone || "")}</td>
          <td>
            <div class="contribution-input-wrap">
              <input
                type="number"
                min="0"
                step="1000"
                class="contribution-input"
                data-member-id="${member.id}"
                value="${amount}"
              >
              <span class="currency-label">đ</span>
            </div>
            <span class="contribution-current">
              Hiện tại: ${formatCurrency(amount)}
            </span>
          </td>
          <td>
            <button
              type="button"
              class="save-contribution-button"
              data-member-id="${member.id}"
            >
              Lưu
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}


function setSponsorMessage(message = "", type = "") {
  if (!sponsorFormMessage) return;

  sponsorFormMessage.textContent = message;
  sponsorFormMessage.className = "form-message";

  if (type) {
    sponsorFormMessage.classList.add(type);
  }
}

function toggleSponsorAmountField() {
  const isMoney = sponsorTypeSelect.value === "money";

  sponsorAmountGroup.classList.toggle(
    "hidden",
    !isMoney,
  );

  if (!isMoney) {
    sponsorAmountInput.value = "";
  }
}

function resetSponsorForm() {
  sponsorIdInput.value = "";
  sponsorNameInput.value = "";
  sponsorTypeSelect.value = "money";
  sponsorAmountInput.value = "";
  sponsorContentInput.value = "";
  sponsorNoteInput.value = "";

  sponsorFormTitle.textContent =
    "Thêm khoản tài trợ";

  saveSponsorButton.textContent =
    "Lưu tài trợ";

  cancelSponsorEditButton.classList.add(
    "hidden",
  );

  toggleSponsorAmountField();
  setSponsorMessage("");
}

function renderSponsors() {
  const keyword = (sponsorSearch.value || "")
    .trim()
    .toLocaleLowerCase("vi");

  const typeFilter = sponsorTypeFilter.value;

  const filtered = classSponsors.filter((item) => {
    const sponsorName = (item.sponsorName || "")
      .toLocaleLowerCase("vi");
    const content = (item.content || "")
      .toLocaleLowerCase("vi");

    const matchesKeyword =
      !keyword ||
      sponsorName.includes(keyword) ||
      content.includes(keyword);

    const matchesType =
      typeFilter === "all" ||
      item.type === typeFilter;

    return matchesKeyword && matchesType;
  });

  sponsorCount.textContent = classSponsors.length;

  const totalMoney = classSponsors.reduce(
    (sum, item) =>
      sum +
      (item.type === "money"
        ? Number(item.amount) || 0
        : 0),
    0,
  );

  sponsorClassTotal.textContent =
    formatCurrency(totalMoney);

  if (filtered.length === 0) {
    sponsorTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">
          ${
            classSponsors.length === 0
              ? "Chưa có dữ liệu tài trợ"
              : "Không tìm thấy khoản tài trợ phù hợp"
          }
        </td>
      </tr>
    `;
    return;
  }

  sponsorTableBody.innerHTML = filtered
    .map((item, index) => {
      const isMoney = item.type === "money";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>
              ${escapeHtml(item.sponsorName || "")}
            </strong>
          </td>
          <td>
            <span class="sponsor-kind-badge ${
              isMoney ? "money" : "in-kind"
            }">
              ${
                isMoney
                  ? "Tiền"
                  : "Hiện vật/dịch vụ"
              }
            </span>
          </td>
          <td>
            <span class="sponsor-value">
              ${
                isMoney
                  ? formatCurrency(item.amount)
                  : "—"
              }
            </span>
          </td>
          <td>${escapeHtml(item.content || "")}</td>
          <td>
            <button
              type="button"
              class="table-action-button edit-sponsor-button"
              data-sponsor-id="${item.id}"
            >
              Sửa
            </button>

            <button
              type="button"
              class="table-action-button delete-sponsor-button"
              data-sponsor-id="${item.id}"
            >
              Xóa
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function stopSponsorSubscription() {
  if (unsubscribeSponsors) {
    unsubscribeSponsors();
    unsubscribeSponsors = null;
  }

  classSponsors = [];
  renderSponsors();
}

function startSponsorSubscription(classId) {
  stopSponsorSubscription();

  sponsorSectionTitle.textContent =
    `Tài trợ của lớp ${classId}`;

  unsubscribeSponsors =
    subscribeSponsorsByClass(
      classId,
      (items) => {
        classSponsors = items;
        renderSponsors();
      },
      () => {
        setSponsorMessage(
          "Không đọc được dữ liệu tài trợ. Vui lòng kiểm tra Firestore Rules.",
          "error",
        );
      },
    );
}





const HOME_TOTAL_CLASSES = 8;

function renderHomeStats() {
  const totalMembers =
    dashboardMembersData.length;

  const totalAttending =
    dashboardMembersData.filter(
      (item) => item.attending === true,
    ).length;

  if (totalClassesHome) {
    totalClassesHome.textContent =
      HOME_TOTAL_CLASSES;
  }

  if (totalParticipantsHome) {
    totalParticipantsHome.textContent =
      `${totalAttending} / ${totalMembers}`;
  }

  /*
   * Ban Tổ chức sẽ làm sau nên tạm giữ 0.
   */
  if (totalOrganizersHome) {
    totalOrganizersHome.textContent = "0";
  }
}

function renderPublicParticipants() {
  if (
    !participantsTableBody ||
    !participantSearch ||
    !participantClassFilter
  ) {
    return;
  }

  const keyword = participantSearch.value
    .trim()
    .toLocaleLowerCase("vi");

  const selectedClass =
    participantClassFilter.value;

  const attendees = dashboardMembersData
    .filter((item) => item.attending === true)
    .filter((item) => {
      const matchesClass =
        !selectedClass ||
        item.classId === selectedClass;

      const fullName = (item.fullName || "")
        .toLocaleLowerCase("vi");

      const matchesName =
        !keyword ||
        fullName.includes(keyword);

      return matchesClass && matchesName;
    })
    .sort((a, b) => {
      const classCompare = (a.classId || "")
        .localeCompare(b.classId || "", "vi");

      if (classCompare !== 0) {
        return classCompare;
      }

      return (a.fullName || "").localeCompare(
        b.fullName || "",
        "vi",
        { sensitivity: "base" },
      );
    });

  publicParticipantCount.textContent =
    attendees.length;

  if (attendees.length === 0) {
    participantsTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">
          Chưa có người xác nhận tham gia phù hợp
        </td>
      </tr>
    `;
    return;
  }

  participantsTableBody.innerHTML =
    attendees
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>
                ${escapeHtml(item.fullName || "")}
              </strong>
            </td>
            <td>${escapeHtml(item.classId || "")}</td>
            <td>
              <span class="public-attending-badge">
                Đã xác nhận
              </span>
            </td>
          </tr>
        `,
      )
      .join("");
}

const DASHBOARD_CLASSES = [
  "12A",
  "12B",
  "12C",
  "12D",
  "12E",
  "12G",
  "12H",
  "12K",
  "12M",
];

function getDashboardClassStats(classId) {
  const members = dashboardMembersData.filter(
    (item) => item.classId === classId,
  );

  const total = members.length;

  const attending = members.filter(
    (item) => item.attending === true,
  ).length;

  const pending = Math.max(
    0,
    total - attending,
  );

  const percent =
    total > 0
      ? Math.round((attending / total) * 100)
      : 0;

  return {
    classId,
    total,
    attending,
    pending,
    percent,
  };
}

function renderDashboard() {
  if (!dashboardClassFilter) return;

  const selectedClass =
    dashboardClassFilter.value;

  let stats;

  if (selectedClass === "all") {
    const total =
      dashboardMembersData.length;

    const attending =
      dashboardMembersData.filter(
        (item) => item.attending === true,
      ).length;

    stats = {
      total,
      attending,
      pending: Math.max(
        0,
        total - attending,
      ),
      percent:
        total > 0
          ? Math.round(
              (attending / total) * 100,
            )
          : 0,
    };

    dashboardScopeLabel.textContent =
      "TOÀN KHÓA";

    dashboardBreakdownTitle.textContent =
      "Tình hình tham gia toàn khóa";
  } else {
    stats =
      getDashboardClassStats(selectedClass);

    dashboardScopeLabel.textContent =
      `LỚP ${selectedClass}`;

    dashboardBreakdownTitle.textContent =
      `Tình hình tham gia lớp ${selectedClass}`;
  }

  dashboardAttending.textContent =
    stats.attending;

  dashboardMembers.textContent =
    stats.total;

  dashboardMemberCard.textContent =
    stats.total;

  dashboardAttendingCard.textContent =
    stats.attending;

  dashboardPendingCard.textContent =
    stats.pending;

  dashboardPercent.textContent =
    `${stats.percent}%`;

  if (dashboardRing) {
    dashboardRing.style.setProperty(
      "--dashboard-percent",
      `${stats.percent}%`,
    );
  }

  const rows =
    selectedClass === "all"
      ? DASHBOARD_CLASSES.map(
          getDashboardClassStats,
        )
      : [
          getDashboardClassStats(
            selectedClass,
          ),
        ];

  dashboardTableBody.innerHTML = rows
    .map(
      (item) => `
        <tr>
          <td>
            <span class="dashboard-class-name">
              ${item.classId}
            </span>
          </td>
          <td>${item.total}</td>
          <td>${item.attending}</td>
          <td>${item.pending}</td>
          <td>
            <span class="dashboard-rate">
              ${item.percent}%
            </span>
            <div class="dashboard-rate-track">
              <div
                class="dashboard-rate-bar"
                style="width: ${item.percent}%"
              ></div>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function startDashboardSubscription() {
  if (unsubscribeDashboard) {
    return;
  }

  unsubscribeDashboard =
    subscribeAllPublicMembers(
      (items) => {
        dashboardMembersData =
          items.filter((item) =>
            DASHBOARD_CLASSES.includes(
              item.classId,
            ),
          );

        renderDashboard();
        renderPublicParticipants();
        renderHomeStats();
      },
      () => {
        dashboardTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="empty-row">
              Không đọc được dữ liệu Dashboard
            </td>
          </tr>
        `;
      },
    );
}

function stopPublicClassSubscriptions() {
  if (unsubscribePublicMembers) {
    unsubscribePublicMembers();
    unsubscribePublicMembers = null;
  }

  if (unsubscribePublicSponsors) {
    unsubscribePublicSponsors();
    unsubscribePublicSponsors = null;
  }

  publicClassMembers = [];
  publicClassSponsors = [];
}

function renderPublicClassDetail() {
  publicClassMemberCount.textContent =
    publicClassMembers.length;

  publicClassAttendingCount.textContent =
    publicClassMembers.filter(
      (item) => item.attending === true,
    ).length;

  const sponsorTotal = publicClassSponsors.reduce(
    (sum, item) =>
      sum +
      (
        item.type === "money"
          ? Number(item.amount) || 0
          : 0
      ),
    0,
  );

  publicClassSponsorTotal.textContent =
    formatCurrency(sponsorTotal);

  if (publicClassMembers.length === 0) {
    publicClassMemberBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-row">
          Chưa có dữ liệu công khai
        </td>
      </tr>
    `;
  } else {
    publicClassMemberBody.innerHTML =
      publicClassMembers
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <strong>
                  ${escapeHtml(item.fullName || "")}
                </strong>
              </td>
              <td>
                ${
                  item.attending === true
                    ? '<span class="attending-status yes">Tham gia</span>'
                    : '<span class="attending-status no">Chưa xác nhận</span>'
                }
              </td>
            </tr>
          `,
        )
        .join("");
  }

  if (publicClassSponsors.length === 0) {
    publicClassSponsorBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">
          Chưa có dữ liệu tài trợ
        </td>
      </tr>
    `;
  } else {
    publicClassSponsorBody.innerHTML =
      publicClassSponsors
        .map(
          (item, index) => {
            const isMoney = item.type === "money";

            return `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <strong>
                    ${escapeHtml(item.sponsorName || "")}
                  </strong>
                </td>
                <td>
                  ${
                    isMoney
                      ? "Tiền"
                      : "Hiện vật/dịch vụ"
                  }
                </td>
                <td>
                  ${
                    isMoney
                      ? formatCurrency(item.amount)
                      : escapeHtml(item.content || "")
                  }
                </td>
              </tr>
            `;
          },
        )
        .join("");
  }
}

function openPublicClass(classId) {
  stopPublicClassSubscriptions();

  publicClassTitle.textContent =
    `Lớp ${classId}`;

  publicClassDetail.classList.remove("hidden");

  unsubscribePublicMembers =
    subscribePublicMembersByClass(
      classId,
      (items) => {
        publicClassMembers = items;
        renderPublicClassDetail();
      },
      () => {
        publicClassMemberBody.innerHTML = `
          <tr>
            <td colspan="3" class="empty-row">
              Không đọc được dữ liệu công khai
            </td>
          </tr>
        `;
      },
    );

  unsubscribePublicSponsors =
    subscribeSponsorsByClass(
      classId,
      (items) => {
        publicClassSponsors = items;
        renderPublicClassDetail();
      },
      () => {
        publicClassSponsorBody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-row">
              Không đọc được dữ liệu tài trợ
            </td>
          </tr>
        `;
      },
    );

  publicClassDetail.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function showLoggedOutUI() {
  currentSession = null;

  stopMemberSubscription();
  stopContributionSubscription();
  stopSponsorSubscription();

  resetMemberForm();
  resetSponsorForm();

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
      /*
       * One-time safe migration:
       * - create publicMembers mirror
       * - move legacy contributionAmount to private contributions
       * - remove contributionAmount from members
       */
      migrateLegacyClassData(
        classId,
        authUser.uid,
      ).catch((error) => {
        console.error(
          "Lỗi chuyển dữ liệu cũ:",
          error,
        );
      });

      startMemberSubscription(classId);
      startContributionSubscription(classId);
      startSponsorSubscription(classId);
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

  showManagementPanel("members");
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
          await showConfirmDialog({
            title: "Xóa thành viên?",
            message:
              `Bạn có chắc muốn xóa "${member.fullName}" khỏi danh sách lớp không?
Hành động này không thể hoàn tác.`,
            confirmText: "Xóa thành viên",
            cancelText: "Hủy",
            type: "danger",
          });

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


if (manageMembersButton) {
  manageMembersButton.addEventListener("click", () => {
    showManagementPanel("members");
  });
}

if (manageParticipantsButton) {
  manageParticipantsButton.addEventListener("click", () => {
    showManagementPanel("participants");
    renderParticipantManagement();
  });
}

if (participantManageSearch) {
  participantManageSearch.addEventListener("input", () => {
    renderParticipantManagement();
  });
}

if (participantStatusFilter) {
  participantStatusFilter.addEventListener("change", () => {
    renderParticipantManagement();
  });
}

if (participantManageTableBody) {
  participantManageTableBody.addEventListener("change", async (event) => {
    const checkbox = event.target.closest(".attendance-checkbox");

    if (!checkbox) return;

    const memberId = checkbox.dataset.memberId;
    const member = classMembers.find((item) => item.id === memberId);

    if (!member) return;

    checkbox.disabled = true;

    try {
      await updateMemberAttendance(memberId, checkbox.checked);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái tham gia:", error);

      checkbox.checked = member.attending === true;

      await showAlertDialog({
        title: "Không thể cập nhật",
        message:
          "Không cập nhật được trạng thái tham gia. Vui lòng kiểm tra Firestore Rules.",
        type: "danger",
      });
    } finally {
      checkbox.disabled = false;
    }
  });
}


if (manageContributionsButton) {
  manageContributionsButton.addEventListener(
    "click",
    () => {
      showManagementPanel("contributions");
      renderContributionManagement();
    },
  );
}

if (contributionSearch) {
  contributionSearch.addEventListener(
    "input",
    () => {
      renderContributionManagement();
    },
  );
}

if (contributionFilter) {
  contributionFilter.addEventListener(
    "change",
    () => {
      renderContributionManagement();
    },
  );
}

if (contributionTableBody) {
  contributionTableBody.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(".save-contribution-button");

      if (!button) return;

      const memberId = button.dataset.memberId;

      const input = contributionTableBody.querySelector(
        `.contribution-input[data-member-id="${memberId}"]`,
      );

      if (!input) return;

      let amount = Number(input.value);

      if (!Number.isFinite(amount) || amount < 0) {
        await showAlertDialog({
          title: "Số tiền không hợp lệ",
          message:
            "Vui lòng nhập số tiền đóng góp hợp lệ, lớn hơn hoặc bằng 0.",
          type: "danger",
        });
        input.focus();
        return;
      }

      amount = Math.round(amount);

      button.disabled = true;
      button.textContent = "Đang lưu...";

      try {
        const member = classMembers.find(
          (item) => item.id === memberId,
        );

        if (!member) {
          throw new Error(
            "Không tìm thấy thành viên.",
          );
        }

        await updateMemberContribution(
          memberId,
          {
            classId: currentSession.profile.classId,
            memberName: member.fullName || "",
            amount,
            updatedBy: currentSession.authUser.uid,
          },
        );
      } catch (error) {
        console.error(
          "Lỗi cập nhật đóng góp:",
          error,
        );

        await showAlertDialog({
          title: "Không thể lưu đóng góp",
          message:
            "Không cập nhật được số tiền đóng góp. Vui lòng kiểm tra Firestore Rules.",
          type: "danger",
        });
      } finally {
        button.disabled = false;
        button.textContent = "Lưu";
      }
    },
  );
}


if (manageSponsorsButton) {
  manageSponsorsButton.addEventListener(
    "click",
    () => {
      showManagementPanel("sponsors");
      renderSponsors();
    },
  );
}

if (sponsorTypeSelect) {
  sponsorTypeSelect.addEventListener(
    "change",
    () => {
      toggleSponsorAmountField();
    },
  );
}

if (sponsorSearch) {
  sponsorSearch.addEventListener(
    "input",
    () => {
      renderSponsors();
    },
  );
}

if (sponsorTypeFilter) {
  sponsorTypeFilter.addEventListener(
    "change",
    () => {
      renderSponsors();
    },
  );
}

if (sponsorForm) {
  sponsorForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!currentSession?.profile) {
        setSponsorMessage(
          "Phiên đăng nhập không hợp lệ.",
          "error",
        );
        return;
      }

      const profile = currentSession.profile;
      const authUser = currentSession.authUser;

      if (profile.role !== "class_editor") {
        setSponsorMessage(
          "Chức năng này hiện dành cho tài khoản đại diện lớp.",
          "error",
        );
        return;
      }

      const sponsorName =
        sponsorNameInput.value.trim();

      const type =
        sponsorTypeSelect.value;

      const amount =
        type === "money"
          ? Number(sponsorAmountInput.value) || 0
          : 0;

      const content =
        sponsorContentInput.value.trim();

      const note =
        sponsorNoteInput.value.trim();

      if (!sponsorName) {
        setSponsorMessage(
          "Vui lòng nhập người/đơn vị tài trợ.",
          "error",
        );
        sponsorNameInput.focus();
        return;
      }

      if (type === "money" && amount < 0) {
        setSponsorMessage(
          "Số tiền tài trợ không hợp lệ.",
          "error",
        );
        sponsorAmountInput.focus();
        return;
      }

      try {
        saveSponsorButton.disabled = true;

        const sponsorId =
          sponsorIdInput.value;

        if (sponsorId) {
          await updateSponsor(
            sponsorId,
            {
              sponsorName,
              type,
              amount,
              content,
              note,
            },
          );

          resetSponsorForm();
          setSponsorMessage(
            "Đã cập nhật khoản tài trợ.",
            "success",
          );
        } else {
          await addSponsor({
            sponsorName,
            type,
            amount,
            content,
            note,
            classId: profile.classId,
            createdBy: authUser.uid,
          });

          resetSponsorForm();
          setSponsorMessage(
            "Đã thêm khoản tài trợ.",
            "success",
          );
        }
      } catch (error) {
        console.error(
          "Lỗi lưu tài trợ:",
          error,
        );

        setSponsorMessage(
          "Không lưu được tài trợ. Vui lòng kiểm tra Firestore Rules.",
          "error",
        );
      } finally {
        saveSponsorButton.disabled = false;
      }
    },
  );
}

if (sponsorTableBody) {
  sponsorTableBody.addEventListener(
    "click",
    async (event) => {
      const editButton =
        event.target.closest(
          ".edit-sponsor-button",
        );

      const deleteButton =
        event.target.closest(
          ".delete-sponsor-button",
        );

      if (editButton) {
        const sponsorId =
          editButton.dataset.sponsorId;

        const item =
          classSponsors.find(
            (row) =>
              row.id === sponsorId,
          );

        if (!item) return;

        sponsorIdInput.value = item.id;
        sponsorNameInput.value =
          item.sponsorName || "";
        sponsorTypeSelect.value =
          item.type || "money";
        sponsorAmountInput.value =
          Number(item.amount) || 0;
        sponsorContentInput.value =
          item.content || "";
        sponsorNoteInput.value =
          item.note || "";

        sponsorFormTitle.textContent =
          "Sửa khoản tài trợ";

        saveSponsorButton.textContent =
          "Cập nhật";

        cancelSponsorEditButton.classList.remove(
          "hidden",
        );

        toggleSponsorAmountField();
        sponsorNameInput.focus();
        return;
      }

      if (deleteButton) {
        const sponsorId =
          deleteButton.dataset.sponsorId;

        const item =
          classSponsors.find(
            (row) =>
              row.id === sponsorId,
          );

        if (!item) return;

        const confirmed =
          await showConfirmDialog({
            title: "Xóa khoản tài trợ?",
            message:
              `Bạn có chắc muốn xóa khoản tài trợ của "${item.sponsorName}" không?
Hành động này không thể hoàn tác.`,
            confirmText: "Xóa tài trợ",
            cancelText: "Hủy",
            type: "danger",
          });

        if (!confirmed) return;

        try {
          await deleteSponsor(sponsorId);

          if (
            sponsorIdInput.value ===
            sponsorId
          ) {
            resetSponsorForm();
          }
        } catch (error) {
          console.error(
            "Lỗi xóa tài trợ:",
            error,
          );

          setSponsorMessage(
            "Không xóa được tài trợ. Vui lòng kiểm tra Firestore Rules.",
            "error",
          );
        }
      }
    },
  );
}

if (cancelSponsorEditButton) {
  cancelSponsorEditButton.addEventListener(
    "click",
    () => {
      resetSponsorForm();
    },
  );
}




if (participantSearch) {
  participantSearch.addEventListener(
    "input",
    () => {
      renderPublicParticipants();
    },
  );
}

if (participantClassFilter) {
  participantClassFilter.addEventListener(
    "change",
    () => {
      renderPublicParticipants();
    },
  );
}

if (dashboardClassFilter) {
  dashboardClassFilter.addEventListener(
    "change",
    () => {
      renderDashboard();
    },
  );
}

startDashboardSubscription();

publicClassButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openPublicClass(button.dataset.classId);
  });
});

if (closePublicClassButton) {
  closePublicClassButton.addEventListener(
    "click",
    () => {
      stopPublicClassSubscriptions();
      publicClassDetail.classList.add("hidden");
    },
  );
}

comingSoonCards.forEach((card) => {
  card.addEventListener("click", () => {
    showAlertDialog({
      title: "Chức năng đang hoàn thiện",
      message:
        `${card.dataset.soon} sẽ được xây dựng ở bước tiếp theo.`,
      type: "info",
    });
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
