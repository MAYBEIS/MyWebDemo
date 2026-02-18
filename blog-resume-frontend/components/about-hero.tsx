import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MapPin, Github, Twitter, Mail, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AboutHero() {
  return (
    <section className="mb-20">
      <div className="flex flex-col items-start gap-10 md:flex-row md:items-start">
        <div className="relative">
          <Avatar className="h-28 w-28 border-2 border-primary/15 shadow-xl shadow-primary/5">
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-mono font-bold">
              SL
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-[3px] border-background" />
        </div>

        <div className="flex-1">
          <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// 关于我"}</span>
          <h1 className="text-4xl font-bold text-foreground mb-3">SysLog</h1>
          <p className="text-lg text-muted-foreground/70 mb-5">
            系统程序员 & 技术写作者
          </p>

          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground/50 mb-8">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              中国 北京
            </span>
          </div>

          <div className="space-y-4 max-w-2xl mb-10">
            <p className="text-foreground/70 leading-[1.8]">
              {"我是一名热衷于底层计算、操作系统与高性能软件工程的系统程序员。日常工作中使用 C 和 Rust 编程，探索内核内部机制，并为推动软件能力边界的开源项目做贡献。"}
            </p>
            <p className="text-foreground/70 leading-[1.8]">
              {"当我不在调试汇编代码或追踪内核路径的时候，我会撰写技术文章分享所学。我信奉「从零构建」的学习方式，我的大部分理解都来自于亲手实现。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Github, label: "GitHub", href: "https://github.com" },
              { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
              { icon: Mail, label: "邮件", href: "mailto:hello@example.com" },
            ].map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2 border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300">
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </a>
            ))}
            <Button variant="outline" size="sm" className="gap-2 border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300">
              <FileText className="h-4 w-4" />
              简历 / CV
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
