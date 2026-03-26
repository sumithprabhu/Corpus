import { Suspense } from "react"
import { LoginContent } from "./login-content"

function LoginFallback() {
  return (
    <div className="min-h-screen dot-grid-bg flex items-center justify-center">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Loading…</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
