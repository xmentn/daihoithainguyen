// firebase/firestore.js

import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* =========================================
   LẤY DANH SÁCH LỚP
========================================= */

async function getClasses() {
  const snapshot = await getDocs(collection(db, "classes"));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export { getClasses };
