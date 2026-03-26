"use client"

import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold tracking-tight uppercase border-b-2 border-foreground pb-3 mb-8 mt-10 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold tracking-tight uppercase mt-12 mb-4 border-l-4 border-[#ea580c] pl-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-8 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground/90 mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-none space-y-2 mb-6 text-sm pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-2 mb-6 text-sm marker:font-mono">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:bg-[#ea580c]">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline underline-offset-2 decoration-[#ea580c] hover:text-[#ea580c]"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const inline = !className
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 text-xs bg-muted border border-foreground/20 font-mono">
          {children}
        </code>
      )
    }
    return <code className={className}>{children}</code>
  },
  pre: ({ children }) => (
    <pre className="border-2 border-foreground bg-muted/40 p-4 overflow-x-auto text-xs font-mono mb-6">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-foreground pl-4 my-6 text-sm text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-t-2 border-foreground" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-8 border-2 border-foreground">
      <table className="w-full text-xs font-mono">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b-2 border-foreground bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="p-3 border-t border-border align-top">{children}</td>,
}

export function DocsMarkdown({ source }: { source: string }) {
  return (
    <div className="docs-prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
