"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Zap,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  Flame,
  Star,
  Target,
  Brain,
  Sparkles,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-store"
import Link from "next/link"

interface Question {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  category: string
}

const allQuestions: Question[] = [
  {
    id: 1,
    question: "Linux 内核使用哪种分配器来管理物理页面？",
    options: ["Slab 分配器", "Buddy 分配器", "Arena 分配器", "Bump 分配器"],
    correctIndex: 1,
    explanation: "Buddy 分配器以 2 的幂次为单位管理物理页面，通过将相邻的「伙伴」块合并来减少外部碎片。Slab 分配器建立在其之上，用于更小粒度的分配。",
    difficulty: "medium",
    category: "Linux 内核",
  },
  {
    id: 2,
    question: "Rust 中，以下哪个关键字用于在编译时保证内存安全的同时允许底层操作？",
    options: ["mut", "unsafe", "raw", "extern"],
    correctIndex: 1,
    explanation: "unsafe 关键字允许开发者执行 5 种「超能力」操作：解引用裸指针、调用 unsafe 函数、访问可变静态变量、实现 unsafe trait 和访问 union 字段。",
    difficulty: "easy",
    category: "Rust",
  },
  {
    id: 3,
    question: "TCP 三次握手的正确顺序是什么？",
    options: ["SYN -> ACK -> FIN", "SYN -> SYN-ACK -> ACK", "ACK -> SYN -> FIN", "SYN -> FIN -> ACK"],
    correctIndex: 1,
    explanation: "三次握手：客户端发送 SYN，服务器回复 SYN-ACK，客户端再发送 ACK。这确保了双方都能确认对方的接收和发送能力。",
    difficulty: "easy",
    category: "网络",
  },
  {
    id: 4,
    question: "x86_64 架构中，哪个寄存器通常用于存放系统调用号？",
    options: ["rdi", "rax", "rcx", "rsp"],
    correctIndex: 1,
    explanation: "在 Linux x86_64 系统调用约定中，rax 寄存器存放系统调用号，rdi/rsi/rdx/r10/r8/r9 依次存放前 6 个参数。",
    difficulty: "hard",
    category: "体系结构",
  },
  {
    id: 5,
    question: "eBPF 程序在 Linux 内核中运行前必须通过什么检查？",
    options: ["类型检查器", "验证器（Verifier）", "JIT 编译器", "链接器"],
    correctIndex: 1,
    explanation: "eBPF 验证器确保程序是安全的：不会无限循环、不会访问越界内存、不会导致内核崩溃。这是 eBPF 安全模型的核心。",
    difficulty: "medium",
    category: "eBPF",
  },
  {
    id: 6,
    question: "以下哪种数据结构最常用于数据库索引？",
    options: ["红黑树", "跳表", "B+ 树", "哈希表"],
    correctIndex: 2,
    explanation: "B+ 树是数据库索引的首选，因为它对磁盘 I/O 友好（高扇出减少树高），叶子节点通过链表连接支持高效范围查询。",
    difficulty: "medium",
    category: "存储",
  },
  {
    id: 7,
    question: "在 C 语言中，volatile 关键字的作用是什么？",
    options: ["让变量不可修改", "防止编译器优化对该变量的读写", "将变量分配到寄存器", "使变量线程安全"],
    correctIndex: 1,
    explanation: "volatile 告诉编译器不要对该变量的访问进行优化，每次都必须从内存读取。常用于硬件寄存器映射和信号处理函数中的变量。",
    difficulty: "easy",
    category: "C/C++",
  },
  {
    id: 8,
    question: "io_uring 相比传统 epoll 的核心优势是什么？",
    options: ["更简单的 API", "减少用户态/内核态切换", "支持更多文件描述符", "内置 TLS 加密"],
    correctIndex: 1,
    explanation: "io_uring 通过共享内存的提交队列(SQ)和完成队列(CQ)实现批量提交和收割 I/O 操作，大幅减少了系统调用的上下文切换开销。",
    difficulty: "hard",
    category: "Linux",
  },
  {
    id: 9,
    question: "RISC-V 指令集架构的「RISC」代表什么？",
    options: [
      "Reduced Instruction Set Computer",
      "Rapid Instruction Scheduling Core",
      "Recursive Instruction Set Compiler",
      "Register Indexed Stack Computer",
    ],
    correctIndex: 0,
    explanation: "RISC（精简指令集计算机）的设计哲学是使用少量简单、固定长度的指令，让硬件实现更简单、频率更高，复杂操作由编译器组合简单指令完成。",
    difficulty: "easy",
    category: "体系结构",
  },
  {
    id: 10,
    question: "在并发编程中，CAS 操作是指什么？",
    options: ["Cache And Store", "Compare And Swap", "Copy And Set", "Conditional And Signal"],
    correctIndex: 1,
    explanation: "Compare-And-Swap 是一种原子操作：比较内存中的值是否等于预期值，如果是则替换为新值。它是无锁数据结构的基础。",
    difficulty: "medium",
    category: "并发",
  },
  {
    id: 11,
    question: "编译器的词法分析阶段将源代码转换为什么？",
    options: ["AST（抽象语法树）", "Token 序列", "中间表示 (IR)", "机器码"],
    correctIndex: 1,
    explanation: "词法分析（Lexing/Scanning）将源代码字符流转换为 Token 序列。每个 Token 代表一个有意义的最小单元，如关键字、标识符、运算符等。",
    difficulty: "easy",
    category: "编译器",
  },
  {
    id: 12,
    question: "Linux 进程间通信中，mmap 配合 MAP_SHARED 标志实现的是什么？",
    options: ["消息队列", "信号机制", "共享内存", "管道通信"],
    correctIndex: 2,
    explanation: "通过 mmap 配合 MAP_SHARED 可以在多个进程间共享同一段物理内存，这是最高效的 IPC 方式，因为数据不需要在用户态和内核态之间拷贝。",
    difficulty: "medium",
    category: "Linux 内核",
  },
]

const difficultyConfig = {
  easy: { label: "简单", color: "bg-primary/10 text-primary border-primary/20", points: 10 },
  medium: { label: "中等", color: "bg-chart-4/10 text-chart-4 border-chart-4/20", points: 20 },
  hard: { label: "困难", color: "bg-destructive/10 text-destructive border-destructive/20", points: 30 },
}

const leaderboard = [
  { name: "kernel_god", avatar: "KG", score: 2840, streak: 32 },
  { name: "rust_wizard", avatar: "RW", score: 2650, streak: 28 },
  { name: "SysLog", avatar: "SL", score: 2420, streak: 25 },
  { name: "bit_flipper", avatar: "BF", score: 2180, streak: 19 },
  { name: "zero_day", avatar: "ZD", score: 1960, streak: 15 },
]

function getDailyQuestions(): Question[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const shuffled = [...allQuestions].sort((a, b) => {
    const hashA = ((a.id * 2654435761 + dayOfYear * 40503) >>> 0) % 1000
    const hashB = ((b.id * 2654435761 + dayOfYear * 40503) >>> 0) % 1000
    return hashA - hashB
  })
  return shuffled.slice(0, 5)
}

export function DailyQuiz() {
  const { user, isLoggedIn } = useAuth()
  const [questions] = useState(() => getDailyQuestions())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerActive, setIsTimerActive] = useState(true)

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    if (!isTimerActive || isAnswered || isComplete) return
    if (timeLeft <= 0) {
      handleTimeout()
      return
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, isTimerActive, isAnswered, isComplete])

  const handleTimeout = useCallback(() => {
    setIsAnswered(true)
    setIsTimerActive(false)
    setAnswers((prev) => [...prev, null])
    toast.error("时间到！")
  }, [])

  const handleAnswer = (index: number) => {
    if (isAnswered) return
    setSelectedAnswer(index)
    setIsAnswered(true)
    setIsTimerActive(false)

    const isCorrect = index === currentQuestion.correctIndex
    setAnswers((prev) => [...prev, index])

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft * 0.5)
      const points = difficultyConfig[currentQuestion.difficulty].points + timeBonus
      setScore((s) => s + points)
      setCorrectCount((c) => c + 1)
      toast.success(`+${points} 分！（含时间奖励 +${timeBonus}）`)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsComplete(true)
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setTimeLeft(30)
      setIsTimerActive(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setScore(0)
    setCorrectCount(0)
    setIsComplete(false)
    setAnswers([])
    setTimeLeft(30)
    setIsTimerActive(true)
  }

  if (isComplete) {
    const percentage = Math.round((correctCount / totalQuestions) * 100)
    const grade =
      percentage >= 80 ? "S" : percentage >= 60 ? "A" : percentage >= 40 ? "B" : "C"
    const gradeColors: Record<string, string> = {
      S: "text-primary text-glow",
      A: "text-chart-4",
      B: "text-chart-2",
      C: "text-muted-foreground",
    }
    const messages: Record<string, string> = {
      S: "太强了！你是真正的系统大师！",
      A: "表现不错！对系统编程有扎实的理解。",
      B: "还可以更好，继续学习吧！",
      C: "加油！系统编程的路还很长。",
    }

    return (
      <div className="animate-slide-up">
        <div className="rounded-xl border border-border/40 bg-card/30 p-10 text-center card-glow">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Trophy className="h-16 w-16 text-chart-4" />
              <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-glow-pulse" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">挑战完成！</h2>
          <p className="text-muted-foreground/60 mb-8">{messages[grade]}</p>

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className={`text-6xl font-bold font-mono ${gradeColors[grade]}`}>{grade}</p>
              <p className="text-xs text-muted-foreground/40 mt-1">评级</p>
            </div>
            <Separator orientation="vertical" className="h-16 bg-border/20" />
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-foreground">{score}</p>
              <p className="text-xs text-muted-foreground/40 mt-1">得分</p>
            </div>
            <Separator orientation="vertical" className="h-16 bg-border/20" />
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-foreground">
                {correctCount}/{totalQuestions}
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1">正确</p>
            </div>
          </div>

          {/* Answer review */}
          <div className="flex justify-center gap-2 mb-8">
            {questions.map((q, i) => {
              const userAnswer = answers[i]
              const isCorrect = userAnswer === q.correctIndex
              return (
                <div
                  key={q.id}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-mono font-bold transition-all ${
                    userAnswer === null
                      ? "border-muted-foreground/20 bg-muted/20 text-muted-foreground/40"
                      : isCorrect
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {userAnswer === null ? "-" : isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <Button onClick={handleRestart} variant="outline" className="gap-2 border-border/40 hover:border-primary/30">
              <RotateCcw className="h-4 w-4" />
              再来一次
            </Button>
            <Button
              onClick={() => {
                toast.success("成绩已分享！")
              }}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Share2 className="h-4 w-4" />
              分享成绩
            </Button>
          </div>
        </div>

        {/* Detailed review */}
        <div className="mt-8 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground/60 mb-2">答题回顾</h3>
          {questions.map((q, i) => {
            const userAnswer = answers[i]
            const isCorrect = userAnswer === q.correctIndex
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-5 ${
                  userAnswer === null
                    ? "border-muted-foreground/15 bg-card/20"
                    : isCorrect
                    ? "border-primary/15 bg-primary/[0.02]"
                    : "border-destructive/15 bg-destructive/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/30 text-xs font-mono text-muted-foreground/50">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80 mb-2">{q.question}</p>
                    <p className="text-xs text-muted-foreground/50 mb-1">
                      {"你的答案："}
                      <span className={isCorrect ? "text-primary" : "text-destructive"}>
                        {userAnswer !== null ? q.options[userAnswer] : "未作答"}
                      </span>
                      {!isCorrect && (
                        <>
                          {" | 正确答案："}
                          <span className="text-primary">{q.options[q.correctIndex]}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground/40 leading-relaxed mt-2">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const timerPercentage = (timeLeft / 30) * 100
  const timerColor =
    timeLeft > 15 ? "bg-primary" : timeLeft > 5 ? "bg-chart-4" : "bg-destructive"

  return (
    <div>
      {/* Progress & stats bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-muted-foreground/40">
            {currentIndex + 1} / {totalQuestions}
          </span>
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                  i < currentIndex
                    ? answers[i] === questions[i].correctIndex
                      ? "bg-primary"
                      : "bg-destructive/60"
                    : i === currentIndex
                    ? "bg-foreground/30"
                    : "bg-secondary/40"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm font-mono text-chart-4">
            <Star className="h-3.5 w-3.5" />
            {score}
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <Clock className="h-3.5 w-3.5" />
            剩余时间
          </div>
          <span className={`text-sm font-mono font-bold ${timeLeft <= 5 ? "text-destructive animate-pulse" : "text-foreground/60"}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="h-1 rounded-full bg-secondary/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-8 mb-6 card-glow">
        <div className="flex items-center gap-2.5 mb-5">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${difficultyConfig[currentQuestion.difficulty].color}`}>
            {difficultyConfig[currentQuestion.difficulty].label}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground/40">{currentQuestion.category}</span>
          <span className="text-xs font-mono text-chart-4/60 ml-auto">
            +{difficultyConfig[currentQuestion.difficulty].points} 分
          </span>
        </div>

        <h3 className="text-xl font-bold text-foreground leading-snug mb-8">
          {currentQuestion.question}
        </h3>

        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((option, index) => {
            let optionStyle = "border-border/40 bg-card/30 hover:border-primary/25 hover:bg-card/60 cursor-pointer"

            if (isAnswered) {
              if (index === currentQuestion.correctIndex) {
                optionStyle = "border-primary/40 bg-primary/8 cursor-default"
              } else if (index === selectedAnswer && index !== currentQuestion.correctIndex) {
                optionStyle = "border-destructive/40 bg-destructive/8 cursor-default"
              } else {
                optionStyle = "border-border/20 bg-card/10 opacity-50 cursor-default"
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={isAnswered}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${optionStyle}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-mono font-bold transition-all ${
                  isAnswered && index === currentQuestion.correctIndex
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : isAnswered && index === selectedAnswer
                    ? "border-destructive/30 bg-destructive/15 text-destructive"
                    : "border-border/30 bg-secondary/20 text-muted-foreground/50"
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`text-sm ${
                  isAnswered && index === currentQuestion.correctIndex
                    ? "text-primary font-medium"
                    : isAnswered && index === selectedAnswer
                    ? "text-destructive"
                    : "text-foreground/70"
                }`}>
                  {option}
                </span>
                {isAnswered && index === currentQuestion.correctIndex && (
                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                )}
                {isAnswered && index === selectedAnswer && index !== currentQuestion.correctIndex && (
                  <XCircle className="h-4 w-4 text-destructive ml-auto shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {isAnswered && (
          <div className="mt-6 rounded-lg border border-border/30 bg-background/30 p-4 animate-slide-up" style={{ animationDuration: "0.3s" }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground/60">知识点解析</span>
            </div>
            <p className="text-sm text-muted-foreground/60 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Next button */}
      {isAnswered && (
        <div className="flex justify-end animate-slide-up" style={{ animationDuration: "0.2s" }}>
          <Button
            onClick={handleNext}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
          >
            {currentIndex + 1 >= totalQuestions ? "查看成绩" : "下一题"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sidebar info */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Leaderboard */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="h-4 w-4 text-chart-4" />
            <h4 className="text-sm font-semibold text-foreground">排行榜</h4>
          </div>
          <div className="flex flex-col gap-2.5">
            {leaderboard.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold w-5 text-center ${
                  i === 0 ? "text-chart-4" : i === 1 ? "text-foreground/50" : i === 2 ? "text-chart-1" : "text-muted-foreground/30"
                }`}>
                  {i + 1}
                </span>
                <Avatar className="h-6 w-6 border border-border/30">
                  <AvatarFallback className="text-[8px] font-mono bg-primary/8 text-primary/60">
                    {entry.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className={`text-sm flex-1 truncate ${entry.name === "SysLog" ? "text-primary font-medium" : "text-foreground/60"}`}>
                  {entry.name}
                </span>
                <span className="text-xs font-mono text-chart-4/60">{entry.score}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-destructive/40">
                  <Flame className="h-2.5 w-2.5" />{entry.streak}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">挑战规则</h4>
          </div>
          <div className="flex flex-col gap-3 text-xs text-muted-foreground/50 leading-relaxed">
            <p className="flex items-start gap-2">
              <Zap className="h-3.5 w-3.5 text-chart-4 shrink-0 mt-0.5" />
              每天 5 道系统编程题目，涵盖内核、网络、编译器等领域。
            </p>
            <p className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              每题 30 秒限时，越快作答得到的时间奖励越多。
            </p>
            <p className="flex items-start gap-2">
              <Star className="h-3.5 w-3.5 text-chart-4 shrink-0 mt-0.5" />
              难度分三级：简单 10 分、中等 20 分、困难 30 分。
            </p>
            <p className="flex items-start gap-2">
              <Flame className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              连续每日完成挑战可积累连胜天数。
            </p>
          </div>
          {!isLoggedIn && (
            <div className="mt-5 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground/40 mb-3">登录后可保存成绩并参与排行</p>
              <Link href="/login">
                <Button size="sm" variant="outline" className="border-border/40 text-xs w-full">
                  前往登录
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
