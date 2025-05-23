"use client"

import { Button } from "@/components/ui/button"
import { History, BarChart3, User } from "lucide-react"
import { Link } from "wouter"

export function Navbar() {
  return (
    <header className="border-b border-neutral-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🐵</span>
              <span className="text-xl font-bold text-neutral-800">SocialScouter</span>
            </Link>
          </div>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="/history">
              <Button
                variant="ghost"
                className="text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <Button variant="ghost" className="text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ads Analyzer
            </Button>
            <Button variant="ghost" className="text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100">
              <User className="h-4 w-4 mr-2" />
              Account
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}