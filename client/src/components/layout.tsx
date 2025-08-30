import Header from "@/components/header";
import AppSidebar from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}