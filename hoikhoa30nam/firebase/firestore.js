// firebase/firestore.js

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* =========================================
   MEMBERS - PRIVATE WORKING DATA
========================================= */

async function addMember({
  fullName,
  phone = "",
  note = "",
  classId,
  createdBy,
}) {
  const memberRef = await addDoc(collection(db, "members"), {
    fullName: fullName.trim(),
    phone: phone.trim(),
    note: note.trim(),
    classId,
    attending: false,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "publicMembers", memberRef.id),
    {
      fullName: fullName.trim(),
      classId,
      attending: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return memberRef;
}

async function updateMember(
  memberId,
  {
    fullName,
    phone = "",
    note = "",
  },
) {
  const memberRef = doc(db, "members", memberId);

  await updateDoc(memberRef, {
    fullName: fullName.trim(),
    phone: phone.trim(),
    note: note.trim(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "publicMembers", memberId),
    {
      fullName: fullName.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function deleteMember(memberId) {
  await deleteDoc(doc(db, "members", memberId));

  try {
    await deleteDoc(doc(db, "publicMembers", memberId));
  } catch (_) {
    // Ignore if public mirror does not exist.
  }

  try {
    await deleteDoc(doc(db, "contributions", memberId));
  } catch (_) {
    // Ignore if private contribution does not exist.
  }
}

async function updateMemberAttendance(memberId, attending) {
  await updateDoc(doc(db, "members", memberId), {
    attending: Boolean(attending),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "publicMembers", memberId),
    {
      attending: Boolean(attending),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function subscribeMembersByClass(
  classId,
  callback,
  errorCallback,
) {
  const q = query(
    collection(db, "members"),
    where("classId", "==", classId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      members.sort((a, b) =>
        (a.fullName || "").localeCompare(
          b.fullName || "",
          "vi",
          { sensitivity: "base" },
        ),
      );

      callback(members);
    },
    (error) => {
      console.error("Lỗi đọc danh sách thành viên:", error);
      if (errorCallback) errorCallback(error);
    },
  );
}

/* =========================================
   PUBLIC MEMBERS
========================================= */

function subscribePublicMembersByClass(
  classId,
  callback,
  errorCallback,
) {
  const q = query(
    collection(db, "publicMembers"),
    where("classId", "==", classId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      members.sort((a, b) =>
        (a.fullName || "").localeCompare(
          b.fullName || "",
          "vi",
          { sensitivity: "base" },
        ),
      );

      callback(members);
    },
    (error) => {
      console.error("Lỗi đọc dữ liệu công khai:", error);
      if (errorCallback) errorCallback(error);
    },
  );
}

/* =========================================
   CONTRIBUTIONS - PRIVATE
========================================= */

async function updateMemberContribution(
  memberId,
  {
    classId,
    memberName,
    amount,
    updatedBy,
  },
) {
  const contributionRef =
    doc(db, "contributions", memberId);

  const normalizedAmount =
    Math.max(0, Number(amount) || 0);

  if (normalizedAmount === 0) {
    try {
      await deleteDoc(contributionRef);
    } catch (_) {
      // Ignore if document does not exist.
    }
    return;
  }

  await setDoc(
    contributionRef,
    {
      memberId,
      memberName: memberName || "",
      classId,
      amount: normalizedAmount,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function subscribeContributionsByClass(
  classId,
  callback,
  errorCallback,
) {
  const q = query(
    collection(db, "contributions"),
    where("classId", "==", classId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      callback(items);
    },
    (error) => {
      console.error("Lỗi đọc đóng góp:", error);
      if (errorCallback) errorCallback(error);
    },
  );
}

/* =========================================
   ONE-TIME MIGRATION FOR LEGACY DATA
========================================= */

async function migrateLegacyClassData(classId, userId) {
  const q = query(
    collection(db, "members"),
    where("classId", "==", classId),
  );

  const snapshot = await getDocs(q);

  for (const item of snapshot.docs) {
    const data = item.data();

    await setDoc(
      doc(db, "publicMembers", item.id),
      {
        fullName: data.fullName || "",
        classId,
        attending: data.attending === true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (Object.prototype.hasOwnProperty.call(
      data,
      "contributionAmount",
    )) {
      const amount =
        Math.max(0, Number(data.contributionAmount) || 0);

      if (amount > 0) {
        await setDoc(
          doc(db, "contributions", item.id),
          {
            memberId: item.id,
            memberName: data.fullName || "",
            classId,
            amount,
            updatedBy: userId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await updateDoc(
        doc(db, "members", item.id),
        {
          contributionAmount: deleteField(),
          updatedAt: serverTimestamp(),
        },
      );
    }
  }
}

/* =========================================
   SPONSORS - PUBLIC READ, PRIVATE WRITE
========================================= */

async function addSponsor({
  sponsorName,
  type = "money",
  amount = 0,
  content = "",
  note = "",
  classId,
  createdBy,
}) {
  const normalizedAmount =
    type === "money"
      ? Math.max(0, Number(amount) || 0)
      : 0;

  return await addDoc(collection(db, "sponsors"), {
    sponsorName: sponsorName.trim(),
    type,
    amount: normalizedAmount,
    content: content.trim(),
    note: note.trim(),
    classId,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function updateSponsor(
  sponsorId,
  {
    sponsorName,
    type = "money",
    amount = 0,
    content = "",
    note = "",
  },
) {
  const normalizedAmount =
    type === "money"
      ? Math.max(0, Number(amount) || 0)
      : 0;

  await updateDoc(doc(db, "sponsors", sponsorId), {
    sponsorName: sponsorName.trim(),
    type,
    amount: normalizedAmount,
    content: content.trim(),
    note: note.trim(),
    updatedAt: serverTimestamp(),
  });
}

async function deleteSponsor(sponsorId) {
  await deleteDoc(doc(db, "sponsors", sponsorId));
}

function subscribeSponsorsByClass(
  classId,
  callback,
  errorCallback,
) {
  const q = query(
    collection(db, "sponsors"),
    where("classId", "==", classId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const sponsors = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      sponsors.sort((a, b) =>
        (a.sponsorName || "").localeCompare(
          b.sponsorName || "",
          "vi",
          { sensitivity: "base" },
        ),
      );

      callback(sponsors);
    },
    (error) => {
      console.error("Lỗi đọc tài trợ:", error);
      if (errorCallback) errorCallback(error);
    },
  );
}

export {
  addMember,
  updateMember,
  deleteMember,
  updateMemberAttendance,
  subscribeMembersByClass,
  subscribePublicMembersByClass,
  updateMemberContribution,
  subscribeContributionsByClass,
  migrateLegacyClassData,
  addSponsor,
  updateSponsor,
  deleteSponsor,
  subscribeSponsorsByClass,
};
