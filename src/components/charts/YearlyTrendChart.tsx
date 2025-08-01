import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { formatCurrencyAmount } from "@/utils/currency"
import { YearlyExpense } from "@/lib/expense-analytics-api"
import { TrendingUp, TrendingDown, LineChart as LineChartIcon, BarChart3 } from "lucide-react"
import { useState } from "react"

interface YearlyTrendChartProps {
  data: YearlyExpense[]
  categoryData?: YearlyCategoryExpenseData[] // 新增：按类别分组的年度数据
  currency: string
  className?: string
}

// 新增：年度类别数据类型
interface YearlyCategoryExpenseData {
  year: number
  categories: {
    [categoryName: string]: number
  }
  total: number
}

const chartConfig = {
  amount: {
    label: "金额",
    color: "hsl(var(--chart-2))",
  },
  // 预定义类别颜色
  streaming: {
    label: "流媒体",
    color: "hsl(var(--chart-1))",
  },
  productivity: {
    label: "生产力",
    color: "hsl(var(--chart-2))",
  },
  cloud: {
    label: "云服务",
    color: "hsl(var(--chart-3))",
  },
  entertainment: {
    label: "娱乐",
    color: "hsl(var(--chart-4))",
  },
  fitness: {
    label: "健身",
    color: "hsl(var(--chart-5))",
  },
  other: {
    label: "其他",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig

export function YearlyTrendChart({ data, categoryData, currency, className }: YearlyTrendChartProps) {
  const [chartType, setChartType] = useState<'line' | 'groupedBar'>('line')
  
  // 获取所有类别名称（用于分组柱状图）
  const allCategories = categoryData ? 
    Array.from(new Set(
      categoryData.flatMap(item => Object.keys(item.categories))
    )).sort() : []

  // 为类别分配颜色
  const getCategoryColor = (category: string, index: number) => {
    const colorKeys = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']
    return `hsl(var(--${colorKeys[index % colorKeys.length]}))`
  }

  // Calculate trend (kept for potential future use)
  const trend = data.length >= 2 
    ? ((data[data.length - 1].amount - data[0].amount) / data[0].amount) * 100
    : 0
  
  const isPositiveTrend = trend > 0
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart
          data={data}
          margin={{
            top: 25,
            right: 15,
            left: 5,
            bottom: 15
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="year"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
            height={40}
            tickMargin={10}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => formatCurrencyAmount(value, currency)}
            width={60}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as YearlyExpense
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <div className="grid gap-2">
                      <div className="font-medium">{label}</div>
                      <div className="grid gap-1 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">金额：</span>
                          <span className="font-medium">
                            {formatCurrencyAmount(data.amount, currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">订阅：</span>
                          <span className="font-medium">{data.subscriptionCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--color-amount)"
            strokeWidth={2}
            dot={{ fill: "var(--color-amount)", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "var(--color-amount)", strokeWidth: 2 }}
          />
        </LineChart>
      )
    } else {
      // 分组柱状图
      return (
        <BarChart
          data={categoryData || []}
          margin={{
            top: 25,
            right: 15,
            left: 5,
            bottom: 15
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="year"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
            height={40}
            tickMargin={10}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => formatCurrencyAmount(value, currency)}
            width={60}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <div className="grid gap-2">
                      <div className="font-medium">{label}</div>
                      <div className="grid gap-1 text-sm">
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground capitalize">{String(entry.dataKey).replace('categories.', '')}:</span>
                            </div>
                            <span className="font-medium">
                              {formatCurrencyAmount(entry.value as number, currency)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t pt-1 mt-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-medium">总计：</span>
                            <span className="font-semibold">
                              {formatCurrencyAmount(
                                payload.reduce((sum, entry) => sum + (entry.value as number), 0), 
                                currency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          {allCategories.map((category, index) => (
            <Bar
              key={category}
              dataKey={`categories.${category}`}
              name={category}
              fill={getCategoryColor(category, index)}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      )
    }
  }
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">年度趋势</CardTitle>
          <CardDescription>
            {chartType === 'line' 
              ? '年度支出随时间变化'
              : '按类别划分的年度支出'
            }
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {/* 图表类型切换按钮 */}
          <div className="flex items-center rounded-md border">
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="rounded-r-none h-8 px-3"
            >
              <LineChartIcon className="h-3 w-3" />
            </Button>
            <Button
              variant={chartType === 'groupedBar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('groupedBar')}
              disabled={!categoryData || categoryData.length === 0}
              className="rounded-l-none h-8 px-3"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {(chartType === 'line' ? data.length === 0 : !categoryData || categoryData.length === 0) ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {chartType === 'line' 
              ? '无可用年度数据'
              : '无可用年度类别数据'
            }
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full overflow-hidden">
              {renderChart()}
            </ChartContainer>
            {/* 分组柱状图图例 */}
            {chartType === 'groupedBar' && allCategories.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center mt-4 pt-4 border-t">
                {allCategories.map((category, index) => (
                  <div key={category} className="flex items-center gap-2 text-sm">
                    <div 
                      className="h-3 w-3 rounded-sm" 
                      style={{ backgroundColor: getCategoryColor(category, index) }}
                    />
                    <span className="text-muted-foreground capitalize">{category}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
