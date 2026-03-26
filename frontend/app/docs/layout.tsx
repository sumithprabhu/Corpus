import { Navbar } from "@/components/navbar"
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav"
import { DocsSidebarDesktop } from "@/components/docs/docs-sidebar"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen dot-grid-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1400px] mx-auto">
        <DocsMobileNav />
        <DocsSidebarDesktop />
        <main className="flex-1 min-w-0 px-5 py-8 lg:px-12 lg:py-12 max-w-4xl">{children}</main>
      </div>
    </div>
  )
}
