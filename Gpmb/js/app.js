// ======================================================
// 1. DỮ LIỆU MẪU THEO GIAI ĐOẠN
// ======================================================

const dataByPhase = {

    all: {
        totalArea: 264.9,
        recoveredArea: 129.7,

        totalLength: 38.8,
        deliveredLength: 19.6,

        totalHouseholds: 933,
        approvedHouseholds: 638,
        paidHouseholds: 531,
        handedOverHouseholds: 458,
        notAgreedHouseholds: 98
    },

    phase1: {
        totalArea: 125.6,
        recoveredArea: 82.4,

        totalLength: 18.2,
        deliveredLength: 12.8,

        totalHouseholds: 468,
        approvedHouseholds: 391,
        paidHouseholds: 336,
        handedOverHouseholds: 302,
        notAgreedHouseholds: 41
    },

    phase2: {
        totalArea: 86.5,
        recoveredArea: 39.2,

        totalLength: 11.7,
        deliveredLength: 5.3,

        totalHouseholds: 289,
        approvedHouseholds: 184,
        paidHouseholds: 151,
        handedOverHouseholds: 127,
        notAgreedHouseholds: 36
    },

    phase3: {
        totalArea: 52.8,
        recoveredArea: 8.1,

        totalLength: 8.9,
        deliveredLength: 1.5,

        totalHouseholds: 176,
        approvedHouseholds: 63,
        paidHouseholds: 44,
        handedOverHouseholds: 29,
        notAgreedHouseholds: 21
    }

};


// ======================================================
// 2. HÀM LẤY PHẦN TỬ HTML THEO ID
// ======================================================

function getElement(id) {
    return document.getElementById(id);
}


// ======================================================
// 3. ĐỊNH DẠNG SỐ
// ======================================================

function formatNumber(value, maximumFractionDigits = 1) {

    return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: maximumFractionDigits
    }).format(value);

}


// ======================================================
// 4. TÍNH PHẦN TRĂM
// ======================================================

function calculatePercent(value, total) {

    if (!total || total <= 0) {
        return 0;
    }

    const percent = (value / total) * 100;

    return Math.min(100, Math.max(0, percent));
}


// ======================================================
// 5. HIỂN THỊ DỮ LIỆU DASHBOARD
// ======================================================

function renderDashboard(phaseKey) {

    const data = dataByPhase[phaseKey];

    if (!data) {
        return;
    }


    // --------------------------------------------------
    // DIỆN TÍCH
    // --------------------------------------------------

    const remainingArea =
        Math.max(
            0,
            data.totalArea - data.recoveredArea
        );

    const areaPercent =
        calculatePercent(
            data.recoveredArea,
            data.totalArea
        );


    getElement("totalArea").textContent =
        formatNumber(data.totalArea);

    getElement("recoveredArea").textContent =
        formatNumber(data.recoveredArea);

    getElement("remainingArea").textContent =
        formatNumber(remainingArea);

    getElement("areaPercent").textContent =
        formatNumber(areaPercent);


    getElement("areaProgressText").textContent =
        formatNumber(areaPercent) + "%";

    getElement("areaProgressBar").style.width =
        areaPercent + "%";


    // --------------------------------------------------
    // CHIỀU DÀI TUYẾN
    // --------------------------------------------------

    const remainingLength =
        Math.max(
            0,
            data.totalLength - data.deliveredLength
        );

    const lengthPercent =
        calculatePercent(
            data.deliveredLength,
            data.totalLength
        );


    getElement("totalLength").textContent =
        formatNumber(data.totalLength);

    getElement("deliveredLength").textContent =
        formatNumber(data.deliveredLength);

    getElement("remainingLength").textContent =
        formatNumber(remainingLength);

    getElement("lengthPercent").textContent =
        formatNumber(lengthPercent);


    getElement("lengthProgressText").textContent =
        formatNumber(lengthPercent) + "%";

    getElement("lengthProgressBar").style.width =
        lengthPercent + "%";


    // --------------------------------------------------
    // HỘ DÂN / TỔ CHỨC
    // --------------------------------------------------

    getElement("totalHouseholds").textContent =
        formatNumber(
            data.totalHouseholds,
            0
        );

    getElement("approvedHouseholds").textContent =
        formatNumber(
            data.approvedHouseholds,
            0
        );

    getElement("paidHouseholds").textContent =
        formatNumber(
            data.paidHouseholds,
            0
        );

    getElement("handedOverHouseholds").textContent =
        formatNumber(
            data.handedOverHouseholds,
            0
        );

    getElement("notAgreedHouseholds").textContent =
        formatNumber(
            data.notAgreedHouseholds,
            0
        );

}


// ======================================================
// 6. HIỂN THỊ CÁC CARD GIAI ĐOẠN
// ======================================================

function renderPhaseCards() {

    const phaseCards =
        getElement("phaseCards");

    if (!phaseCards) {
        return;
    }


    const phases = [

        {
            key: "phase1",
            name: "Giai đoạn 1"
        },

        {
            key: "phase2",
            name: "Giai đoạn 2"
        },

        {
            key: "phase3",
            name: "Giai đoạn 3"
        }

    ];


    let html = "";


    phases.forEach(function (phase) {

        const data =
            dataByPhase[phase.key];

        const percent =
            calculatePercent(
                data.recoveredArea,
                data.totalArea
            );


        html += `

            <div class="phase-card">

                <div class="phase-card-header">

                    <h3>
                        ${phase.name}
                    </h3>

                </div>


                <div class="phase-percent">

                    <strong>
                        ${formatNumber(percent)}%
                    </strong>

                </div>


                <div class="progress">

                    <div
                        class="progress-bar"
                        style="width: ${percent}%;">
                    </div>

                </div>


                <div class="phase-note">

                    Đã thu hồi
                    <strong>
                        ${formatNumber(data.recoveredArea)}
                    </strong>

                    /

                    <strong>
                        ${formatNumber(data.totalArea)}
                    </strong>

                    ha

                </div>

            </div>

        `;

    });


    phaseCards.innerHTML = html;

}


// ======================================================
// 7. XỬ LÝ KHI CHỌN GIAI ĐOẠN
// ======================================================

const phaseSelect =
    getElement("phaseSelect");


if (phaseSelect) {

    phaseSelect.addEventListener(
        "change",
        function () {

            const selectedPhase =
                phaseSelect.value;

            renderDashboard(
                selectedPhase
            );

        }
    );

}


// ======================================================
// 8. KHỞI TẠO KHI TRANG ĐƯỢC MỞ
// ======================================================

renderDashboard("all");

renderPhaseCards();