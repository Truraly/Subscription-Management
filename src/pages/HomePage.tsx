import { useState, useEffect } from "react"
import {
  Calendar,
  Clock,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

import {
  useSubscriptionStore,
  Subscription
} from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import { formatCurrencyAmount } from "@/utils/currency"
import { getCurrentMonthSpending, getCurrentYearSpending } from "@/lib/expense-analytics-api"

import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { StatCard } from "@/components/dashboard/StatCard"
import { UpcomingRenewals } from "@/components/dashboard/UpcomingRenewals"
import { RecentlyPaid } from "@/components/dashboard/RecentlyPaid"
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown"
import { ImportModal } from "@/components/imports/ImportModal"

function HomePage() {
  const { toast } = useToast()
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  // Get the default view from settings
  const { currency: userCurrency, fetchSettings } = useSettingsStore()
  
  const {
    subscriptions,
    bulkAddSubscriptions,
    updateSubscription,
    fetchSubscriptions,
    getUpcomingRenewals,
    getRecentlyPaid,
    getSpendingByCategory,
    initializeData,
    initializeWithRenewals,
    isLoading
  } = useSubscriptionStore()

  // State for API-based spending data
  const [monthlySpending, setMonthlySpending] = useState<number>(0)
  const [yearlySpending, setYearlySpending] = useState<number>(0)
  const [isLoadingSpending, setIsLoadingSpending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize subscriptions without auto-renewals
  useEffect(() => {
    const initialize = async () => {
      await fetchSettings()
      await initializeData()
    }

    initialize()
  }, []) // Remove dependencies to prevent infinite re-renders

  // Load spending data from API
  useEffect(() => {
    const loadSpendingData = async () => {
      setIsLoadingSpending(true)

      try {
        const [currentMonth, currentYear] = await Promise.all([
          getCurrentMonthSpending(userCurrency),
          getCurrentYearSpending(userCurrency)
        ])

        setMonthlySpending(currentMonth)
        setYearlySpending(currentYear)
      } catch (error) {
        console.error('Failed to load spending data:', error)
      } finally {
        setIsLoadingSpending(false)
      }
    }

    if (userCurrency) {
      loadSpendingData()
    }
  }, [userCurrency])

  // Handler for updating subscription
  const handleUpdateSubscription = async (id: number, data: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await updateSubscription(id, data)

    if (error) {
      toast({
        title: "更新订阅出错",
        description: error.message || "更新订阅失败",
        variant: "destructive"
      })
      return
    }

    setEditingSubscription(null)
    toast({
      title: "订阅已更新",
      description: `${data.name} 已成功更新。`
    })
  }

  // Handler for manual refresh with renewals
  const handleRefreshWithRenewals = async () => {
    setIsRefreshing(true)
    try {
      await initializeWithRenewals()

      // Also refresh spending data
      if (userCurrency) {
        const [currentMonth, currentYear] = await Promise.all([
          getCurrentMonthSpending(userCurrency),
          getCurrentYearSpending(userCurrency)
        ])
        setMonthlySpending(currentMonth)
        setYearlySpending(currentYear)
      }

      toast({
        title: "数据已刷新",
        description: "订阅数据和续费已处理完毕。"
      })
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast({
        title: "刷新失败",
        description: "数据刷新失败，请重试。",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }



  // Handler for importing subscriptions
  const handleImportSubscriptions = async (newSubscriptions: Omit<Subscription, "id">[]) => {
    const { error } = await bulkAddSubscriptions(newSubscriptions);

    if (error) {
      toast({
        title: "导入失败",
        description: error.message || "导入订阅失败",
        variant: "destructive",
      });
    } else {
      toast({
        title: "导入成功",
        description: `${newSubscriptions.length} 个订阅已成功导入。`,
      });
    }

    // Final fetch to ensure UI is up-to-date
    fetchSubscriptions();
  };



  // Get data for dashboard (non-API data)
  const upcomingRenewals = getUpcomingRenewals(7)
  const recentlyPaidSubscriptions = getRecentlyPaid(7)
  const spendingByCategory = getSpendingByCategory()

  if (isLoading || isLoadingSpending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">正在加载订阅...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">仪表板</h1>
          <p className="text-muted-foreground">
            您的订阅费用和活动概览
          </p>
        </div>
        <Button
          onClick={handleRefreshWithRenewals}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '刷新中...' : '刷新数据'}
        </Button>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="月度支出"
              value={formatCurrencyAmount(monthlySpending, userCurrency)}
              description="当月费用"
              icon={Calendar}
              iconColor="text-blue-500"
            />
            <StatCard
              title="年度支出"
              value={formatCurrencyAmount(yearlySpending, userCurrency)}
              description="当年总费用"
              icon={Calendar}
              iconColor="text-purple-500"
            />
            <StatCard
              title="活跃订阅"
              value={subscriptions.filter(sub => sub.status === "active").length}
              description="服务总数"
              icon={Clock}
              iconColor="text-green-500"
            />
          </div>
          
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <RecentlyPaid
              subscriptions={recentlyPaidSubscriptions}
            />

            <UpcomingRenewals
              subscriptions={upcomingRenewals}
            />

            <CategoryBreakdown data={spendingByCategory} />
          </div>
        </div>



      {/* Forms and Modals */}
      {editingSubscription && (
        <SubscriptionForm
          open={Boolean(editingSubscription)}
          onOpenChange={() => setEditingSubscription(null)}
          initialData={editingSubscription}
          onSubmit={(data) => handleUpdateSubscription(editingSubscription.id, data)}
        />
      )}
      
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportSubscriptions}
      />
    </>
  )
}

export default HomePage