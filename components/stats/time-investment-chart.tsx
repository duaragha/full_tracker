"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface CategoryTime {
  category: string
  hours: number
  color: string
}

interface TimeInvestmentChartProps {
  data: CategoryTime[]
  title?: string
  description?: string
}

export function TimeInvestmentChart({
  data,
  title = "Time Investment by Category",
  description = "Hours spent this period"
}: TimeInvestmentChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-30" />
            <XAxis
              dataKey="category"
              className="text-muted-foreground"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              className="text-muted-foreground"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}h`, "Hours"]}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
