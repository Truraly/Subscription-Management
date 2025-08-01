import { useState, useEffect } from "react"
import { 
  Calendar, 
  Plus, 
  Search, 
  Tags,
  Check,
  Download,
  Upload,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { useToast } from "@/hooks/use-toast"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmation } from "@/hooks/use-confirmation"

import { 
  useSubscriptionStore, 
  Subscription, 
  SubscriptionStatus,
  BillingCycle
} from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import { exportSubscriptionsToCSV } from "@/lib/subscription-utils"

import { SubscriptionCard } from "@/components/subscription/SubscriptionCard"
import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog"
import { ImportModal } from "@/components/imports/ImportModal"

export function SubscriptionsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [currentView, setCurrentView] = useState<"all" | "active" | "cancelled">("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBillingCycles, setSelectedBillingCycles] = useState<BillingCycle[]>([])
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [billingCycleFilterOpen, setBillingCycleFilterOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [detailSubscription, setDetailSubscription] = useState<Subscription | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const { fetchSettings } = useSettingsStore()
  
  const {
    subscriptions,
    categories,
    addSubscription,
    bulkAddSubscriptions,
    updateSubscription,
    deleteSubscription,
    fetchSubscriptions,
    getUniqueCategories,
    initializeData,
    initializeWithRenewals,
    manualRenewSubscription,
    isLoading
  } = useSubscriptionStore()

  // Initialize subscriptions without auto-renewals
  useEffect(() => {
    const initialize = async () => {
      await fetchSettings()
      await initializeData()
    }

    initialize()
  }, []) // Remove dependencies to prevent infinite re-renders
  
  // Get categories actually in use
  const usedCategories = getUniqueCategories()
  
  // Get unique billing cycles in use
  const getUniqueBillingCycles = () => {
    const billingCycles = subscriptions.map(sub => sub.billingCycle)
    return Array.from(new Set(billingCycles)).map(cycle => ({
      value: cycle,
      label: cycle.charAt(0).toUpperCase() + cycle.slice(1)
    }))
  }
  
  const usedBillingCycles = getUniqueBillingCycles()

  // Filter subscriptions based on search term, current view, selected categories and billing cycles
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        sub.plan.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      currentView === "all" || 
      (currentView === "active" && sub.status !== "cancelled") ||
      (currentView === "cancelled" && sub.status === "cancelled")
    
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(categoryValue => {
        const category = categories.find(cat => cat.value === categoryValue)
        return category && sub.categoryId === category.id
      })
      
    const matchesBillingCycle =
      selectedBillingCycles.length === 0 ||
      selectedBillingCycles.includes(sub.billingCycle)
    
    return matchesSearch && matchesStatus && matchesCategory && matchesBillingCycle
  })

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    const dateA = new Date(a.nextBillingDate).getTime()
    const dateB = new Date(b.nextBillingDate).getTime()

    if (sortOrder === "asc") {
      return dateA - dateB
    } else {
      return dateB - dateA
    }
  })

  // Handler for adding new subscription
  const handleAddSubscription = async (subscription: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await addSubscription(subscription)
    
    if (error) {
      toast({
        title: "添加订阅出错",
        description: error.message || "添加订阅失败",
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "订阅已添加",
      description: `${subscription.name} 已成功添加。`
    })
  }

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

  // State for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  
  // Handler for deleting subscription
  const handleDeleteSubscription = async () => {
    if (!deleteTarget) return
    
    const { error } = await deleteSubscription(deleteTarget.id)
    
    if (error) {
      toast({
        title: "删除订阅出错",
        description: error.message || "删除订阅失败",
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "订阅已删除",
      description: `${deleteTarget.name} 已删除。`,
      variant: "destructive"
    })
    
    setDeleteTarget(null)
  }
  
  // Confirmation dialog hook
  const deleteConfirmation = useConfirmation({
    title: "删除订阅",
    description: deleteTarget ? `确定要删除"${deleteTarget.name}"吗？此操作无法撤销。` : "",
    confirmText: "删除",
    onConfirm: handleDeleteSubscription,
  })
  
  // Handler to open delete confirmation
  const handleDeleteClick = (id: number) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return
    
    setDeleteTarget({ id, name: subscription.name })
    deleteConfirmation.openDialog()
  }

  // Handler for changing subscription status
  const handleStatusChange = async (id: number, status: SubscriptionStatus) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return

    const { error } = await updateSubscription(id, { status })

    if (error) {
      toast({
        title: "更新状态出错",
        description: error.message || "更新状态失败",
        variant: "destructive"
      })
      return
    }

    toast({
      title: status === "active" ? "订阅已激活" : "订阅已取消",
      description: `${subscription.name} 已${status === "active" ? "激活" : "取消"}。`
    })
  }

  // Handler for manual renewal
  const handleManualRenew = async (id: number) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return

    const { error, renewalData } = await manualRenewSubscription(id)

    if (error) {
      toast({
        title: "续费出错",
        description: error,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "订阅续费成功",
      description: `${subscription.name} 已续费。下次计费日期：${renewalData?.newNextBilling}`
    })
  }

  // Handler for toggling a category in the filter
  const toggleCategoryFilter = (categoryValue: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryValue)) {
        return prev.filter(c => c !== categoryValue)
      } else {
        return [...prev, categoryValue]
      }
    })
  }
  
  // Handler for toggling a billing cycle in the filter
  const toggleBillingCycleFilter = (billingCycle: BillingCycle) => {
    setSelectedBillingCycles(prev => {
      if (prev.includes(billingCycle)) {
        return prev.filter(c => c !== billingCycle)
      } else {
        return [...prev, billingCycle]
      }
    })
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

  // Handler for exporting subscriptions
  const handleExportSubscriptions = () => {
    // Generate CSV data
    const csvData = exportSubscriptionsToCSV(subscriptions)
    
    // Create a blob and download link
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    toast({
      title: "导出成功",
      description: "您的订阅已导出为CSV文件。"
    })
  }
  
  // Get billing cycle badge variant
  const getBillingCycleBadgeVariant = (billingCycle: BillingCycle) => {
    switch (billingCycle) {
      case 'yearly':
        return "success" // Green color for yearly
      case 'monthly':
        return "warning" // Orange/yellow for monthly
      case 'quarterly':
        return "info" // Blue for quarterly
      default:
        return "outline"
    }
  }

  if (isLoading) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">订阅</h1>
          <p className="text-muted-foreground">
            管理您的所有订阅服务
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowAddForm(true)} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>添加订阅</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setShowImportModal(true)} size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>导入</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleExportSubscriptions} size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>导出</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <SearchInput
            placeholder="搜索订阅..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4 text-muted-foreground" />}
          />

          <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Tags className="h-4 w-4" />
                {selectedCategories.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>按类别筛选</span>
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedCategories([])}
                    >
                      重置
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                {usedCategories.map((category) => (
                  <div
                    key={category.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 transition-colors hover:bg-muted cursor-pointer",
                      selectedCategories.includes(category.value) && "bg-muted"
                    )}
                    onClick={() => toggleCategoryFilter(category.value)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedCategories.includes(category.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "opacity-50 border-primary"
                    )}
                    >
                      {selectedCategories.includes(category.value) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm">{category.label}</div>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {subscriptions.filter(s => s.category?.value === category.value).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Billing Cycle Filter */}
          <Popover open={billingCycleFilterOpen} onOpenChange={setBillingCycleFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <CalendarIcon className="h-4 w-4" />
                {selectedBillingCycles.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {selectedBillingCycles.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>按账单周期筛选</span>
                  {selectedBillingCycles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedBillingCycles([])}
                    >
                      重置
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                {usedBillingCycles.map((cycle) => (
                  <div
                    key={cycle.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 transition-colors hover:bg-muted cursor-pointer",
                      selectedBillingCycles.includes(cycle.value as BillingCycle) && "bg-muted"
                    )}
                    onClick={() => toggleBillingCycleFilter(cycle.value as BillingCycle)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedBillingCycles.includes(cycle.value as BillingCycle)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "opacity-50 border-primary"
                    )}
                    >
                      {selectedBillingCycles.includes(cycle.value as BillingCycle) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm">{cycle.label}</div>
                    <Badge
                      variant={getBillingCycleBadgeVariant(cycle.value as BillingCycle)}
                      className="ml-auto text-xs"
                    >
                      {subscriptions.filter(s => s.billingCycle === cycle.value).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>按下次计费日期排序 ({sortOrder === 'asc' ? '升序' : '降序'})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "all" ? "default" : "outline"}
            onClick={() => setCurrentView("all")}
          >
            全部
          </Button>
          <Button
            variant={currentView === "active" ? "default" : "outline"}
            onClick={() => setCurrentView("active")}
          >
            有效的
          </Button>
          <Button
            variant={currentView === "cancelled" ? "default" : "outline"}
            onClick={() => setCurrentView("cancelled")}
          >
            已取消
          </Button>
        </div>
      </div>

      {/* Display selected category filters */}
      {(selectedCategories.length > 0 || selectedBillingCycles.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map(categoryValue => {
            const category = categories.find(c => c.value === categoryValue)
            return (
              <Badge
                key={categoryValue}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {category?.label || categoryValue}
                <button
                  onClick={() => toggleCategoryFilter(categoryValue)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <span className="sr-only">移除</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </Badge>
            )
          })}

          {/* Display selected billing cycle filters */}
          {selectedBillingCycles.map(cycleValue => {
            const cycle = usedBillingCycles.find(c => c.value === cycleValue)
            return (
              <Badge
                key={cycleValue}
                variant={getBillingCycleBadgeVariant(cycleValue)}
                className="flex items-center gap-1 px-2 py-1"
              >
                {cycle?.label || cycleValue}
                <button
                  onClick={() => toggleBillingCycleFilter(cycleValue)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <span className="sr-only">移除</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 text-white"
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Subscriptions Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Loading skeleton cards */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border bg-card shadow animate-pulse">
              <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-5 bg-muted rounded w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-40"></div>
                  <div className="h-4 bg-muted rounded w-28"></div>
                  <div className="h-4 bg-muted rounded w-36"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium mb-1">未找到订阅</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategories.length > 0 || selectedBillingCycles.length > 0
              ? `当前筛选条件下无结果。请尝试更改搜索词或筛选器。`
              : currentView !== "all"
                ? `您没有任何${currentView === 'active' ? '有效的' : '已取消'}的订阅。`
                : "从添加您的第一个订阅开始吧。"
            }
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加订阅
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              导入订阅
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={() => setEditingSubscription(subscription)}
              onDelete={() => handleDeleteClick(subscription.id)}
              onStatusChange={handleStatusChange}
              onManualRenew={handleManualRenew}
              onViewDetails={(subscription) => setDetailSubscription(subscription)}
            />
          ))}
        </div>
      )}

      {/* Forms and Modals */}
      <SubscriptionForm
        open={showAddForm || editingSubscription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingSubscription(null)
          }
        }}
        initialData={editingSubscription || undefined}
        onSubmit={editingSubscription
          ? (data) => handleUpdateSubscription(editingSubscription.id, data)
          : handleAddSubscription
        }
      />

      <SubscriptionDetailDialog
        subscription={detailSubscription}
        open={detailSubscription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailSubscription(null)
          }
        }}
        onEdit={(id) => {
          const subscription = subscriptions.find(s => s.id === id)
          if (subscription) {
            setEditingSubscription(subscription)
            setDetailSubscription(null)
          }
        }}
        onManualRenew={handleManualRenew}
      />

      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportSubscriptions}
      />
      <ConfirmDialog {...deleteConfirmation.dialogProps} />
    </>
  )
}
