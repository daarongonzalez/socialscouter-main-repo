import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Zap } from "lucide-react";

interface PlanInfo {
  planType: string;
  planLimits: {
    maxBatchSize: number;
    monthlyVideoLimit: number;
  };
  currentUsage: {
    monthlyVideoCount: number;
    remainingVideos: number;
    lastResetDate: string;
  };
  subscriptionStatus: string | null;
}

export function UsageDisplay() {
  const { data: planInfo, isLoading } = useQuery<PlanInfo>({
    queryKey: ['/api/user/plan'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planInfo) {
    return null;
  }

  const usagePercentage = (planInfo.currentUsage.monthlyVideoCount / planInfo.planLimits.monthlyVideoLimit) * 100;
  const isNearLimit = usagePercentage > 80;
  const planDisplayName = planInfo.planType.charAt(0).toUpperCase() + planInfo.planType.slice(1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Current Plan</span>
          <Badge 
            variant={planInfo.subscriptionStatus === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {planDisplayName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Monthly Videos
            </span>
            <span className={isNearLimit ? "text-orange-600" : "text-gray-600"}>
              {planInfo.currentUsage.monthlyVideoCount} / {planInfo.planLimits.monthlyVideoLimit}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
          <p className="text-xs text-gray-500">
            {planInfo.currentUsage.remainingVideos} videos remaining this month
          </p>
        </div>

        {/* Batch Size Limit */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Max Batch Size
          </span>
          <span className="font-medium">
            {planInfo.planLimits.maxBatchSize} videos
          </span>
        </div>

        {/* Reset Date */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Usage Resets
          </span>
          <span>
            {new Date(new Date(planInfo.currentUsage.lastResetDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </span>
        </div>

        {/* Warning if near limit */}
        {isNearLimit && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              You're approaching your monthly limit. Consider upgrading your plan for more capacity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}