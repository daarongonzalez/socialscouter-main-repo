import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContentTypeFilterProps {
  contentType: 'tiktok' | 'reels' | 'shorts';
  onContentTypeChange: (type: 'tiktok' | 'reels' | 'shorts') => void;
}

export default function ContentTypeFilter({ contentType, onContentTypeChange }: ContentTypeFilterProps) {
  const contentTypes = [
    { id: 'tiktok', label: 'TikTok', icon: '🎵' },
    { id: 'reels', label: 'Instagram Reels', icon: '📸' },
    { id: 'shorts', label: 'YouTube Shorts', icon: '📺' },
  ] as const;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Content Type</h3>
        <div className="flex flex-wrap gap-3">
          {contentTypes.map((type) => (
            <Button
              key={type.id}
              variant={contentType === type.id ? "default" : "outline"}
              onClick={() => onContentTypeChange(type.id)}
              className={`px-4 py-2 transition-all ${
                contentType === type.id
                  ? 'bg-blue-ribbon hover:bg-blue-ribbon/90 text-white border-blue-ribbon'
                  : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
