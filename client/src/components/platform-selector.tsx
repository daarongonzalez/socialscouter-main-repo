"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const platforms: Array<{ value: 'tiktok' | 'reels' | 'shorts'; label: string; icon: string }> = [
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "reels", label: "Instagram Reels", icon: "📸" },
  { value: "shorts", label: "YouTube Shorts", icon: "📺" },
]

interface PlatformSelectorProps {
  contentType: 'tiktok' | 'reels' | 'shorts';
  onContentTypeChange: (type: 'tiktok' | 'reels' | 'shorts') => void;
}

export function PlatformSelector({ contentType, onContentTypeChange }: PlatformSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-neutral-800">
        Content Type
      </Label>
      <div className="space-y-2">
        {platforms.map((platform) => (
          <Button
            key={platform.value}
            variant={contentType === platform.value ? "default" : "outline"}
            onClick={() => onContentTypeChange(platform.value)}
            className={`w-full justify-start h-12 ${
              contentType === platform.value
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span className="text-lg mr-3">{platform.icon}</span>
            {platform.label}
          </Button>
        ))}
      </div>
    </div>
  )
}