import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthForm } from "@/components/auth-form"

export const metadata = {
  title: "登录 | SysLog",
  description: "登录你的账号，发表评论，参与社区互动。",
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 pt-20 pb-16">
        {/* Background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10">
          <AuthForm />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
