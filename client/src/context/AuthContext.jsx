// src/context/AuthContext.jsx
// Provides { user, userProfile, loading } to the entire app.
// userProfile is the Firestore document from /users/{uid} and includes the role.

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc }        from "firebase/firestore";
import { auth, db }           from "../utils/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setUserProfile(snap.exists() ? { uid: firebaseUser.uid, ...snap.data() } : null);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — use anywhere inside <AuthProvider> */
export function useAuth() {
  return useContext(AuthContext);
}
