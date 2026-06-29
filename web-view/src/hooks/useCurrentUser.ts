import { useState, useEffect } from "react";
import { useLoginContext } from "../api/LoginInfo";
import { getUser } from "../api/userAPI";
import type { UserType } from "../../../sharedTypes/userTypes";

export function useCurrentUser(): { user: UserType | null; loading: boolean } {
  const { loginInfo } = useLoginContext();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loginInfo) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUser(loginInfo.id)
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loginInfo]);

  return { user, loading };
}
