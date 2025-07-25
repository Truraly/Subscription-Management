import { HandCoins } from "lucide-react";
import { Subscription } from "@/store/subscriptionStore";
import { formatDate } from "@/lib/subscription-utils";
import { formatWithUserCurrency } from "@/utils/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

interface RecentlyPaidProps {
  subscriptions: Subscription[];
  className?: string;
}

export function RecentlyPaid({ subscriptions, className }: RecentlyPaidProps) {
  return (
    <Card className={cn("min-h-[200px] flex flex-col", className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg">最近付款</CardTitle>
        <CardDescription>
          过去7天内已付款的订阅
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {subscriptions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <HandCoins className="h-10 w-10 text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">过去7天内没有订阅付款</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-col">
                  <div className="font-medium">{subscription.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {subscription.plan}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatWithUserCurrency(subscription.amount, subscription.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      付款日期：{formatDate(subscription.lastBillingDate!)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 