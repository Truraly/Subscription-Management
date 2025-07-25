import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Download, Upload, Eye, EyeOff } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent, 
  SelectItem,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmation } from "@/hooks/use-confirmation"

import { useSettingsStore, ThemeType } from "@/store/settingsStore"
import { ImportModal } from "@/components/imports/ImportModal"
import { useSubscriptionStore } from "@/store/subscriptionStore"
import {
  exportSubscriptionsToJSON,
  downloadFile,
} from "@/lib/subscription-utils"
import { useToast } from "@/hooks/use-toast"
import { ExchangeRateManager } from "@/components/ExchangeRateManager"
import { OptionsManager } from "@/components/subscription/OptionsManager"
import { useTheme } from "next-themes"

export function SettingsPage() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Get tab from URL params
  const defaultTab = searchParams.get('tab') || 'general'

  // Theme from next-themes
  const { setTheme: setNextTheme } = useTheme()

  // Settings store values
  const {
    apiKey,
    setApiKey,
    theme,
    setTheme,



    resetSettings,
    isLoading,
    fetchSettings
  } = useSettingsStore()

  // API Key local state
  const [tempApiKey, setTempApiKey] = useState(apiKey || "")
  const [isKeyVisible, setIsKeyVisible] = useState(false)

  // Subscription store methods
  const { subscriptions, resetSubscriptions, addSubscription } = useSubscriptionStore()

  useEffect(() => {
    fetchSettings()
  }, []) // Remove dependencies to prevent infinite re-renders
  
  // When the API key from the store changes, update the local state
  useEffect(() => {
    if (apiKey) {
      setTempApiKey(apiKey)
    }
  }, [apiKey])



  const handleSaveApiKey = async () => {
    await setApiKey(tempApiKey)
    toast({
      title: "API Key Saved",
      description: "Your new API key has been securely saved.",
    })
  }

  // Handle data export
  const handleExportData = () => {
    const data = exportSubscriptionsToJSON(subscriptions)
    downloadFile(data, "subscriptions.json", "application/json")
  }

  // Handle imports
  const handleImportData = (subscriptionData: any[]) => {
    subscriptionData.forEach((sub) => {
      addSubscription(sub)
    })
  }

  // Handle data reset with confirmation
  const handleResetData = async () => {
    await resetSubscriptions()
    await resetSettings()
    window.location.reload()
  }
  
  const resetConfirmation = useConfirmation({
    title: "Reset All Data",
    description: "Are you sure you want to reset all data? This will permanently delete all subscriptions, payment history, and settings. This action cannot be undone.",
    confirmText: "Reset All Data",
    onConfirm: handleResetData,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">正在加载设置...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-3xl font-bold tracking-tight">设置</h2>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto mb-4 sm:overflow-visible">
          <TabsList className="mb-4 min-w-max sm:min-w-0">
            <TabsTrigger value="general" className="text-xs sm:text-sm px-2 sm:px-3">通用</TabsTrigger>
            <TabsTrigger value="currency" className="text-xs sm:text-sm px-2 sm:px-3">货币</TabsTrigger>
            <TabsTrigger value="options" className="text-xs sm:text-sm px-2 sm:px-3">选项</TabsTrigger>

            <TabsTrigger value="data" className="text-xs sm:text-sm px-2 sm:px-3">数据</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>常规设置</CardTitle>
              <CardDescription>自定义您的常规偏好设置</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="theme">主题模式</Label>
                <Select
                  value={theme}
                  onValueChange={async (value: ThemeType) => {
                    // Update both stores to keep them in sync
                    await setTheme(value)
                    setNextTheme(value)
                  }}
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="选择一个主题" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">浅色</SelectItem>
                    <SelectItem value="dark">深色</SelectItem>
                    <SelectItem value="system">跟随系统</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  在浅色、深色或系统偏好之间进行选择
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <ExchangeRateManager />
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <OptionsManager />
        </TabsContent>
   
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API 与同步</CardTitle>
              <CardDescription>
                管理用于后端同步的 API 密钥。该密钥存储在本地。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="api-key">API 密钥</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="api-key"
                    type={isKeyVisible ? "text" : "password"}
                    placeholder="输入您的 API 密钥"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                  >
                    {isKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  创建、更新或删除订阅需要 API 密钥。
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveApiKey}>保存 API 密钥</Button>
            </CardFooter>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>数据管理</CardTitle>
              <CardDescription>
                导出您的订阅或从其他服务导入
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                导出数据
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                导入数据
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4 border-destructive">
            <CardHeader>
              <CardTitle>重置数据</CardTitle>
              <CardDescription>
                这将永久删除您的所有订阅和设置。此操作无法撤消。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={resetConfirmation.openDialog}>
                重置所有数据
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      
      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={handleImportData}
      />
      
      {/* Reset Confirmation Dialog */}
      <ConfirmDialog {...resetConfirmation.dialogProps} />
    </>
  )
}
