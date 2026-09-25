// firebase/firestore.js

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

async function addMember({
  fullName,
  phone = "",
  note = "",
  classId,
  createdBy,
}) {
  return await addDoc(collection(db, "members"), {
    fullName: fullName.trim(),
    phone: phone.trim(),
    note: note.trim(),
    classId,
    attending: false,
    contributionAmount: 0,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
}

async function deleteMember(memberId) {
  const memberRef = doc(db, "members", memberId);
  await deleteDoc(memberRef);
}

async function updateMemberAttendance(memberId, attending) {
  const memberRef = doc(db, "members", memberId);

  await updateDoc(memberRef, {
    attending: Boolean(attending),
    updatedAt: serverTimestamp(),
  });
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
      console.error(
        "Lỗi đọc danh sách thành viên:",
        error,
      );

      if (errorCallback) {
        errorCallback(error);
      }
    },
  );
}

export {
  addMember,
  updateMember,
  deleteMember,
  updateMemberAttendance,
  subscribeMembersByClass,
};
