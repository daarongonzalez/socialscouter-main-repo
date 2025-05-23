"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { History, BarChart3, User } from "lucide-react"

export function Navbar() {
  return (
    <header className="border-b border-neutral-lighter">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🐵</span>
              <span className="text-xl font-bold text-neutral-darkest">SocialScouter</span>
            </Link>
          </div>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="/history">
              <Button
                variant="ghost"
                className="text-neutral-dark hover:text-neutral-darkest hover:bg-neutral-lightest"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <Button variant="ghost" className="text-neutral-dark hover:text-neutral-darkest hover:bg-neutral-lightest">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ads Analyzer
            </Button>
            <Button variant="ghost" className="text-neutral-dark hover:text-neutral-darkest hover:bg-neutral-lightest">
              <User className="h-4 w-4 mr-2" />
              Account
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
