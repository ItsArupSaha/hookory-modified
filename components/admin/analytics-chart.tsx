"use client"

import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell
} from "recharts"
import { cn } from "@/lib/utils"

interface ChartContainerProps {
    title: string
    description?: string
    children: React.ReactNode
    className?: string
}

export function ChartContainer({ title, description, children, className }: ChartContainerProps) {
    return (
        <div className={cn("rounded-xl border border-stone-200 bg-white p-6 shadow-sm", className)}>
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
                {description && (
                    <p className="text-sm text-stone-500">{description}</p>
                )}
            </div>
            {children}
        </div>
    )
}

interface LineChartData {
    name: string
    [key: string]: string | number
}

interface AnalyticsLineChartProps {
    data: LineChartData[]
    dataKey: string
    color?: string
    height?: number
}

export function AnalyticsLineChart({
    data,
    dataKey,
    color = "#10b981",
    height = 300
}: AnalyticsLineChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e5e5' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                />
                <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: color }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}

interface AnalyticsAreaChartProps {
    data: LineChartData[]
    dataKeys: { key: string; color: string; name: string }[]
    height?: number
}

export function AnalyticsAreaChart({ data, dataKeys, height = 300 }: AnalyticsAreaChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                    }}
                />
                <Legend />
                {dataKeys.map((dk) => (
                    <Area
                        key={dk.key}
                        type="monotone"
                        dataKey={dk.key}
                        name={dk.name}
                        stroke={dk.color}
                        fill={dk.color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    )
}

interface AnalyticsBarChartProps {
    data: LineChartData[]
    dataKey: string
    color?: string
    height?: number
}

export function AnalyticsBarChart({
    data,
    dataKey,
    color = "#10b981",
    height = 300
}: AnalyticsBarChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                    }}
                />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

interface PieChartData {
    name: string
    value: number
    color: string
    [key: string]: string | number
}

interface AnalyticsPieChartProps {
    data: PieChartData[]
    height?: number
}

export function AnalyticsPieChart({ data, height = 300 }: AnalyticsPieChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                    }}
                />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    )
}
