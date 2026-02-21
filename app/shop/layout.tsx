import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-screen bg-background">
      <NavHeader />
      {children}
      <SiteFooter />
    </main>
  )
}
