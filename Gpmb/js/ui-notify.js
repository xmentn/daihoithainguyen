// ======================================================
// UI-NOTIFY.JS
//
// Hệ thống thông báo dùng chung:
// - Modal xác nhận
// - Toast thông báo
// ======================================================


// ======================================================
// 1. KHỞI TẠO GIAO DIỆN
// ======================================================

function ensureNotifyUI() {

    // Nếu đã tạo rồi thì không tạo lại
    if (
        document.getElementById("appConfirmModal")
        &&
        document.getElementById("appToastContainer")
    ) {
        return;
    }


    // ==================================================
    // MODAL XÁC NHẬN
    // ==================================================

    const modal = document.createElement("div");

    modal.id = "appConfirmModal";

    modal.className = "app-confirm-modal";

    modal.setAttribute("aria-hidden", "true");


    modal.innerHTML = `

        <div class="app-confirm-overlay"></div>

        <div
            class="app-confirm-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appConfirmTitle"
        >

            <div
                class="app-confirm-icon"
                id="appConfirmIcon"
            >
                ?
            </div>


            <div class="app-confirm-content">

                <h3 id="appConfirmTitle">
                    Xác nhận
                </h3>

                <p id="appConfirmMessage">
                    Bạn có chắc chắn muốn thực hiện thao tác này?
                </p>

            </div>


            <div class="app-confirm-actions">

                <button
                    type="button"
                    id="appConfirmCancel"
                    class="app-confirm-cancel"
                >
                    Hủy
                </button>


                <button
                    type="button"
                    id="appConfirmOk"
                    class="app-confirm-ok"
                >
                    Đồng ý
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    // ==================================================
    // TOAST
    // ==================================================

    const toastContainer =
        document.createElement("div");


    toastContainer.id =
        "appToastContainer";


    toastContainer.className =
        "app-toast-container";


    document.body.appendChild(
        toastContainer
    );

}



// ======================================================
// 2. HỘP XÁC NHẬN
//
// const ok = await showConfirm({...})
// ======================================================

export function showConfirm(options = {}) {

    ensureNotifyUI();


    const modal =
        document.getElementById(
            "appConfirmModal"
        );


    const titleElement =
        document.getElementById(
            "appConfirmTitle"
        );


    const messageElement =
        document.getElementById(
            "appConfirmMessage"
        );


    const iconElement =
        document.getElementById(
            "appConfirmIcon"
        );


    const okButton =
        document.getElementById(
            "appConfirmOk"
        );


    const cancelButton =
        document.getElementById(
            "appConfirmCancel"
        );


    const overlay =
        modal.querySelector(
            ".app-confirm-overlay"
        );


    // ==================================================
    // OPTIONS
    // ==================================================

    const title =
        options.title
        ||
        "Xác nhận";


    const message =
        options.message
        ||
        "Bạn có chắc chắn muốn thực hiện thao tác này?";


    const confirmText =
        options.confirmText
        ||
        "Đồng ý";


    const cancelText =
        options.cancelText
        ||
        "Hủy";


    const type =
        options.type
        ||
        "warning";


    // ==================================================
    // HIỂN THỊ
    // ==================================================

    titleElement.textContent =
        title;


    messageElement.textContent =
        message;


    okButton.textContent =
        confirmText;


    cancelButton.textContent =
        cancelText;


    modal.classList.remove(
        "type-warning",
        "type-danger",
        "type-info",
        "type-success"
    );


    modal.classList.add(
        "type-" + type
    );


    // Icon
    switch (type) {

        case "danger":
            iconElement.textContent = "!";
            break;

        case "success":
            iconElement.textContent = "✓";
            break;

        case "info":
            iconElement.textContent = "i";
            break;

        default:
            iconElement.textContent = "?";

    }


    modal.classList.add(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );


    // Focus nút hủy để tránh bấm nhầm
    setTimeout(
        function () {
            cancelButton.focus();
        },
        50
    );


    // ==================================================
    // TRẢ VỀ PROMISE TRUE/FALSE
    // ==================================================

    return new Promise(
        function (resolve) {


            function closeModal(result) {

                modal.classList.remove(
                    "show"
                );


                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );


                document.body.classList.remove(
                    "modal-open"
                );


                okButton.removeEventListener(
                    "click",
                    handleConfirm
                );


                cancelButton.removeEventListener(
                    "click",
                    handleCancel
                );


                overlay.removeEventListener(
                    "click",
                    handleCancel
                );


                document.removeEventListener(
                    "keydown",
                    handleKeyboard
                );


                resolve(result);

            }


            function handleConfirm() {

                closeModal(true);

            }


            function handleCancel() {

                closeModal(false);

            }


            function handleKeyboard(event) {

                if (event.key === "Escape") {

                    closeModal(false);

                }

            }


            okButton.addEventListener(
                "click",
                handleConfirm
            );


            cancelButton.addEventListener(
                "click",
                handleCancel
            );


            overlay.addEventListener(
                "click",
                handleCancel
            );


            document.addEventListener(
                "keydown",
                handleKeyboard
            );

        }
    );

}



// ======================================================
// 3. TOAST
//
// showToast("Đã lưu dữ liệu", "success")
// ======================================================

export function showToast(
    message,
    type = "success",
    duration = 3200
) {

    ensureNotifyUI();


    const container =
        document.getElementById(
            "appToastContainer"
        );


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `app-toast app-toast-${type}`;


    let icon = "✓";


    if (type === "error") {
        icon = "!";
    }

    else if (type === "warning") {
        icon = "!";
    }

    else if (type === "info") {
        icon = "i";
    }


    toast.innerHTML = `

        <div class="app-toast-icon">
            ${icon}
        </div>

        <div class="app-toast-message"></div>

        <button
            type="button"
            class="app-toast-close"
            aria-label="Đóng thông báo"
        >
            ×
        </button>

    `;


    toast.querySelector(
        ".app-toast-message"
    ).textContent =
        message;


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        function () {

            toast.classList.add(
                "show"
            );

        }
    );


    const closeButton =
        toast.querySelector(
            ".app-toast-close"
        );


    function removeToast() {

        toast.classList.remove(
            "show"
        );


        setTimeout(
            function () {

                toast.remove();

            },
            220
        );

    }


    closeButton.addEventListener(
        "click",
        removeToast
    );


    setTimeout(
        removeToast,
        duration
    );

}