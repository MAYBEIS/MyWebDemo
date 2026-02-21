import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { UserProfile } from "@/components/user-profile"

export const metadata = {
  title: "个人中心 | SysLog",
  description: "管理你的账户信息和偏好设置。",
}

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <UserProfile />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
