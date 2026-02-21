import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { Guestbook } from "@/components/guestbook"

export const metadata = {
  title: "留言板 | SysLog",
  description: "在留言板中留下你的想法、建议或问候。",
}

export default function GuestbookPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-14">
            <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// 留言板"}</span>
            <h1 className="text-4xl font-bold text-foreground mb-4">留言板</h1>
            <p className="text-muted-foreground/60 max-w-lg leading-relaxed">
              留下你的想法、分享你的感受，或者只是打个招呼。所有留言都欢迎。
            </p>
          </div>
          <Guestbook />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
