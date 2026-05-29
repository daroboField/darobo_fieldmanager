import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHYguXNxgoBQq0rdoFOj9MMppCU9kmE-Y",
  authDomain: "citycoin2025.firebaseapp.com",
  databaseURL: "https://citycoin2025-default-rtdb.firebaseio.com",
  projectId: "citycoin2025",
  storageBucket: "citycoin2025.firebasestorage.app",
  messagingSenderId: "1024446979523",
  appId: "1:1024446979523:web:f2b3b89e039c92aaef7176",
};

const fireConn = initializeApp(firebaseConfig);

export const db = getFirestore(fireConn);
