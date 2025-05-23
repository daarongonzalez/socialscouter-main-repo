"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const platforms = [
  { value: "youtube-shorts", label: "Youtube Shorts" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram-reels", label: "Instagram Reels" },
]

export function PlatformSelector() {
  const [platform, setPlatform] = useState("youtube-shorts")

  return (
    <div className="space-y-2">
      <Label htmlFor="platform-select" className="text-sm font-medium text-neutral-darkest">
        Choose a platform:
      </Label>
      <Select value={platform} onValueChange={setPlatform}>
        <SelectTrigger id="platform-select" className="w-full bg-neutral-lightest border-neutral-lighter">
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {platforms.map((platform) => (
            <SelectItem key={platform.value} value={platform.value}>
              {platform.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
