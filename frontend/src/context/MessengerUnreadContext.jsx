import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/api";

const MessengerUnreadContext = createContext({
  unreadCount: 0,
  refresh: () => {},
});

export function MessengerUnreadProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    Promise.all([
      api.get("/messenger/unread-count").then((r) => Number(r.data?.count) || 0).catch(() => 0),
      api.get("/group-messenger/unread-count").then((r) => Number(r.data?.count) || 0).catch(() => 0),
    ]).then(([dm, group]) => setUnreadCount(dm + group));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 12000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const value = { unreadCount, refresh };
  return (
    <MessengerUnreadContext.Provider value={value}>
      {children}
    </MessengerUnreadContext.Provider>
  );
}

export function useMessengerUnread() {
  return useContext(MessengerUnreadContext);
}
