import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Link } from "lucide-react";

interface URLInputsProps {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  contentType: 'tiktok' | 'reels' | 'shorts';
}

export default function URLInputs({ urls, onUrlsChange, contentType }: URLInputsProps) {
  const placeholders = {
    tiktok: 'https://www.tiktok.com/@username/video/...',
    reels: 'https://www.instagram.com/reel/...',
    shorts: 'https://www.youtube.com/shorts/...',
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    onUrlsChange(newUrls);
  };

  const validateUrl = (url: string): 'valid' | 'invalid' | 'empty' => {
    if (!url) return 'empty';
    return /^https?:\/\//.test(url) ? 'valid' : 'invalid';
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">Video URLs</h3>
          <span className="text-sm text-neutral-500">Up to 5 videos</span>
        </div>
        <div className="space-y-4">
          {urls.map((url, index) => {
            const status = validateUrl(url);
            return (
              <div key={index} className="space-y-2">
                <Label htmlFor={`url-${index}`} className="text-sm font-medium text-neutral-700">
                  Video URL {index + 1}
                </Label>
                <div className="relative">
                  <Input
                    id={`url-${index}`}
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder={placeholders[contentType]}
                    className="pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {status === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                    {status === 'empty' && <Link className="w-4 h-4 text-neutral-400" />}
                  </div>
                </div>
                {status !== 'empty' && (
                  <div className="flex items-center text-sm">
                    {status === 'valid' ? (
                      <span className="text-green-600">Valid URL format</span>
                    ) : (
                      <span className="text-red-600">Invalid URL format</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
