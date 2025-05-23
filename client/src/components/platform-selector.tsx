"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const platforms = [
  { value: "shorts", label: "Youtube Shorts" },
  { value: "tiktok", label: "TikTok" },
  { value: "reels", label: "Instagram Reels" },
]

interface PlatformSelectorProps {
  contentType: 'tiktok' | 'reels' | 'shorts';
  onContentTypeChange: (type: 'tiktok' | 'reels' | 'shorts') => void;
}

export function PlatformSelector({ contentType, onContentTypeChange }: PlatformSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="platform-select" className="text-sm font-medium text-neutral-800">
        Choose a platform:
      </Label>
      <Select value={contentType} onValueChange={onContentTypeChange}>
        <SelectTrigger id="platform-select" className="w-full bg-neutral-100 border-neutral-200">
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