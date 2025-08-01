"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, X, CheckCircle, XCircle, Link } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UrlInputListProps {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  contentType: 'tiktok' | 'reels' | 'shorts';
}

export function UrlInputList({ urls, onUrlsChange, contentType }: UrlInputListProps) {
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    onUrlsChange(newUrls)
  }

  const addUrlField = () => {
    if (urls.length < 8) {
      onUrlsChange([...urls, ""])
    }
  }

  const removeUrlField = (index: number) => {
    if (urls.length > 5 && index >= 5) {
      const newUrls = [...urls]
      newUrls.splice(index, 1)
      onUrlsChange(newUrls)
    }
  }

  const validateUrl = (url: string): 'valid' | 'invalid' | 'empty' => {
    if (!url.trim()) return 'empty';
    return /^https?:\/\//.test(url.trim()) ? 'valid' : 'invalid';
  }

  const getPlaceholder = () => {
    switch (contentType) {
      case 'tiktok':
        return 'https://www.tiktok.com/@username/video/...'
      case 'reels':
        return 'https://www.instagram.com/reel/...'
      case 'shorts':
        return 'https://www.youtube.com/shorts/...'
      default:
        return 'url: https://bestreelev...'
    }
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-neutral-800">Clips to Analyze:</Label>
      <div className="space-y-3">
        {urls.map((url, index) => {
          const status = validateUrl(url);
          return (
            <div key={index} className="space-y-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder={getPlaceholder()}
                    className="w-full bg-neutral-100 border-neutral-200 text-sm pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {status === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                    {status === 'empty' && <Link className="w-4 h-4 text-neutral-400" />}
                  </div>
                </div>
                {index >= 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUrlField(index)}
                    className="h-10 w-10 text-neutral-600 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                )}
              </div>
              {status !== 'empty' && (
                <div className="flex items-center text-xs">
                  {status === 'valid' ? (
                    <span className="text-green-600">✓ Valid URL format</span>
                  ) : (
                    <span className="text-red-600">✗ Invalid URL format</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add URL
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Premium</DialogTitle>
            <DialogDescription>
              Unlock the ability to analyze more than 5 URLs at once by upgrading to our Premium plan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-neutral-100 p-4">
              <h3 className="font-medium text-neutral-800 mb-2">Premium Benefits:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="mr-2 text-blue-600">✓</span>
                  Analyze up to 20 URLs simultaneously
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-blue-600">✓</span>
                  Advanced sentiment metrics
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-blue-600">✓</span>
                  Export data in multiple formats
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-blue-600">✓</span>
                  Priority support
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" type="button">
              Maybe Later
            </Button>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700">
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}