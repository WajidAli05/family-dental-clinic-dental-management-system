import { create } from "zustand";

export const useUserStore = create((set) => ({
  // Dummy users
  users: [
    { email: "owner@fdc.com", password: "owner123", role: "owner" },
    { email: "dentist@fdc.com", password: "dentist123", role: "dentist" },
    { email: "receptionist@fdc.com", password: "reception123", role: "receptionist" },
    { email: "lab@fdc.com", password: "lab123", role: "lab" },
  ],

  // Logged-in user state
  currentUser: null,
  token: null,
  error: null,

  // Login function
  login: (email, password) =>
    set((state) => {
      const user = state.users.find(
        (u) => u.email === email && u.password === password
      );

      if (!user) {
        return { error: "Invalid email or password", currentUser: null, token: null };
      }

      const token = "dummy-token-123";

      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ role: user.role }));

      return {
        currentUser: { email: user.email, role: user.role },
        token,
        error: null,
      };
    }),

  // Logout
  logout: () =>
    set(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return {
        currentUser: null,
        token: null,
        error: null,
      };
    }),
}));