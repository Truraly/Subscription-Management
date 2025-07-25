import { useState, useEffect } from "react"
import { format } from "date-fns"
import { getBaseCurrency } from '@/config/currency'

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { calculateNextBillingDateFromStart } from "@/lib/subscription-utils"
import { Subscription, useSubscriptionStore } from "@/store/subscriptionStore"

// Form components
import { FormField } from "./form/FormField"
import { CategorySelector } from "./form/CategorySelector"
import { PaymentMethodSelector } from "./form/PaymentMethodSelector"
import { AmountInput } from "./form/AmountInput"
import { SubscriptionFormData, FormErrors } from "./form/types"
import { validateForm, handleFieldChange } from "./form/validation"

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Subscription
  onSubmit: (data: SubscriptionFormData & { nextBillingDate: string }) => void
}

export function SubscriptionForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: SubscriptionFormProps) {
  // Get categories, payment methods and plan options from store
  const {
    categories,
    paymentMethods
  } = useSubscriptionStore()

  // State for form data and validation errors
  const [form, setForm] = useState<SubscriptionFormData>({
    name: "",
    plan: "",
    billingCycle: "monthly",
    amount: 0,
    currency: getBaseCurrency(),
    paymentMethodId: 0,
    startDate: format(new Date(), "yyyy-MM-dd"),
    status: "active",
    categoryId: 0,
    renewalType: "manual",
    notes: "",
    website: ""
  })

  // State for form errors
  const [errors, setErrors] = useState<FormErrors>({})

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      const { lastBillingDate, category, paymentMethod, ...formData } = initialData
      setForm({
        ...formData,
        website: formData.website || ""
      })
    }
  }, [initialData])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      if (!initialData) {
        setForm({
          name: "",
          plan: "",
          billingCycle: "monthly",
          amount: 0,
          currency: "USD",
          paymentMethodId: 0,
          startDate: format(new Date(), "yyyy-MM-dd"),
          status: "active",
          categoryId: 0,
          renewalType: "manual",
          notes: "",
          website: ""
        })
      }
      setErrors({})
    }
  }, [open, initialData])

  // Handle basic input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    handleFieldChange(name, value, setForm, errors, setErrors)
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    handleFieldChange(name, value, setForm, errors, setErrors)
  }



  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors = validateForm(form)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Calculate next billing date based on start date, current date and billing cycle
    const nextBillingDate = calculateNextBillingDateFromStart(
      new Date(form.startDate),
      new Date(),
      form.billingCycle
    )

    // Submit the form with calculated next billing date
    onSubmit({
      ...form,
      nextBillingDate
    })
    onOpenChange(false)
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? "编辑订阅" : "添加新订阅"}</DialogTitle>
            <DialogDescription>
              {initialData 
                ? "在下方更新您的订阅详情" 
                : "在下方输入您的订阅详情"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Subscription name */}
            <FormField label="名称" error={errors.name} required>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={errors.name ? "border-destructive" : ""}
              />
            </FormField>

            {/* Subscription plan */}
            <FormField label="计划" error={errors.plan} required>
              <Input
                id="plan"
                name="plan"
                value={form.plan}
                onChange={handleChange}
                placeholder="例如：高级版、家庭版、基础版..."
                className={errors.plan ? "border-destructive" : ""}
              />
            </FormField>

            {/* Category */}
            <CategorySelector
              value={form.categoryId}
              onChange={(value) => handleFieldChange('categoryId', value, setForm, errors, setErrors)}
              categories={categories}
              error={errors.categoryId}
            />

            {/* Amount and Currency */}
            <AmountInput
              amount={form.amount}
              currency={form.currency}
              onAmountChange={(value) => handleFieldChange('amount', value, setForm, errors, setErrors)}
              onCurrencyChange={(value) => handleFieldChange('currency', value, setForm, errors, setErrors)}
              error={errors.amount}
            />

            {/* Billing Cycle */}
            <FormField label="账单周期" required>
              <Select 
                value={form.billingCycle} 
                onValueChange={(value) => handleSelectChange("billingCycle", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择账单周期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">按月</SelectItem>
                  <SelectItem value="yearly">按年</SelectItem>
                  <SelectItem value="quarterly">按季度</SelectItem>
                </SelectContent>
              </Select>
            </FormField>



            {/* Payment Method */}
            <PaymentMethodSelector
              value={form.paymentMethodId}
              onChange={(value) => handleFieldChange('paymentMethodId', value, setForm, errors, setErrors)}
              paymentMethods={paymentMethods}
              error={errors.paymentMethodId}
            />

            {/* Start Date */}
            <FormField label="开始日期">
              <DatePicker
                value={form.startDate ? new Date(form.startDate) : undefined}
                onChange={(date) => {
                  if (date) {
                    handleFieldChange('startDate', format(date, "yyyy-MM-dd"), setForm, errors, setErrors)
                  }
                }}
                placeholder="选择一个日期"
              />
            </FormField>

            {/* Status */}
            <FormField label="状态">
              <Select
                value={form.status}
                onValueChange={(value: "active" | "trial" | "cancelled") => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">有效的</SelectItem>
                  <SelectItem value="trial">试用</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Renewal Type */}
            <FormField label="续订类型">
              <Select
                value={form.renewalType}
                onValueChange={(value: "auto" | "manual") => handleSelectChange("renewalType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择续订类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动续订</SelectItem>
                  <SelectItem value="manual">手动续订</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Website */}
            <FormField label="网站">
              <Input
                id="website"
                name="website"
                value={form.website || ""}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </FormField>

            {/* Notes */}
            <FormField label="备注">
              <Textarea
                id="notes"
                name="notes"
                value={form.notes || ""}
                onChange={handleChange}
                placeholder="任何附加信息..."
              />
            </FormField>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">
              {initialData ? "更新" : "添加"} 订阅
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}