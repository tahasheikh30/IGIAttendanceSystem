import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { RangeProvider } from "../context/RangeContext";
import { AuthProvider } from "../context/AuthContext";

let lastLocation = null;
function LocationSpy() {
  lastLocation = useLocation();
  return null;
}
export const currentLocation = () => lastLocation;

// Renders `ui` inside a router and the range context. Pass `auth: true` to also wrap it in AuthProvider (the api
// module must then be mocked, and a token put in sessionStorage by the test).
export function renderWithProviders(ui, { route = "/", path, auth = false } = {}) {
  const body = path ? <Routes><Route path={path} element={ui} /></Routes> : ui;
  const tree = (
    <MemoryRouter initialEntries={[route]}>
      <LocationSpy />
      <RangeProvider>{body}</RangeProvider>
    </MemoryRouter>
  );
  return render(auth ? <AuthProvider>{tree}</AuthProvider> : tree);
}

// Lets a test set whatever role it needs without going through the sign in flow: pairs with a mocked useAuth.
export function authValue(me, extra = {}) {
  return {
    token: "t", login: () => {}, logout: () => {}, isAuthenticated: true, me, meLoading: false,
    role: me?.role, isAdmin: me?.role === "admin", isHod: me?.role === "hod",
    companies: me?.companies || [], departments: me?.departments || [], ...extra,
  };
}
