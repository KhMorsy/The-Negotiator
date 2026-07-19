import { AppShell } from "@/frontend/layout/AppShell";

export default function UiLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
