import { useState, useEffect, useCallback } from "react";
import { ref, onValue, set, get, push, update, remove } from "firebase/database";
import { rtdb, auth } from "@/lib/firebase";
import { useAuth } from "./useAuth";

export interface HouseholdMember {
  uid: string;
  email: string;
  role: "admin" | "member";
  addedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Check if current user is admin
  useEffect(() => {
    if (!user) { setIsAdmin(null); return; }

    const roleRef = ref(rtdb, `users/${user.uid}/role`);
    const unsubscribe = onValue(roleRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsAdmin(snapshot.val() === "admin");
      } else {
        // First user gets admin role automatically, or set as member
        get(ref(rtdb, "users")).then((usersSnap) => {
          const hasAnyUser = usersSnap.exists() && Object.keys(usersSnap.val()).length > 0;
          // Check if any admin exists
          let adminExists = false;
          if (usersSnap.exists()) {
            Object.values(usersSnap.val()).forEach((u: any) => {
              if (u.role === "admin") adminExists = true;
            });
          }
          const role = (!hasAnyUser || !adminExists) ? "admin" : "member";
          set(ref(rtdb, `users/${user.uid}`), {
            uid: user.uid,
            email: user.email,
            role,
            addedAt: new Date().toISOString(),
          });
          setIsAdmin(role === "admin");
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to all household members
  useEffect(() => {
    const usersRef = ref(rtdb, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: HouseholdMember[] = Object.values(data).map((u: any) => ({
          uid: u.uid,
          email: u.email || "Unknown",
          role: u.role || "member",
          addedAt: u.addedAt || "",
        }));
        setMembers(list);
      } else {
        setMembers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to activity logs (last 50)
  useEffect(() => {
    const logsRef = ref(rtdb, "activityLogs");
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: ActivityLog[] = Object.entries(data)
          .map(([id, l]: [string, any]) => ({
            id,
            userId: l.userId || "",
            userEmail: l.userEmail || "Unknown",
            action: l.action || "",
            details: l.details || "",
            timestamp: l.timestamp || "",
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
        setActivityLogs(list);
      } else {
        setActivityLogs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const setMemberRole = useCallback(async (uid: string, role: "admin" | "member") => {
    await update(ref(rtdb, `users/${uid}`), { role });
    await logActivity("Role changed", `Set user to ${role}`);
  }, []);

  const removeMember = useCallback(async (uid: string) => {
    await remove(ref(rtdb, `users/${uid}`));
    await logActivity("Member removed", `Removed user ${uid}`);
  }, []);

  const logActivity = useCallback(async (action: string, details: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const logRef = push(ref(rtdb, "activityLogs"));
    await set(logRef, {
      userId: currentUser.uid,
      userEmail: currentUser.email || "Unknown",
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return {
    isAdmin,
    members,
    activityLogs,
    setMemberRole,
    removeMember,
    logActivity,
  };
}
