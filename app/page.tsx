import { NavHeader } from "@/components/nav-header"
import { HeroSection } from "@/components/hero-section"
import { FeaturedPosts } from "@/components/featured-posts"
import { ProjectsPreview } from "@/components/projects-preview"
import { SkillsSection } from "@/components/skills-section"
import { SiteFooter } from "@/components/site-footer"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <NavHeader />
      <HeroSection />
      <FeaturedPosts />
      <SkillsSection />
      <ProjectsPreview />
      <SiteFooter />
    </main>
  )
}
