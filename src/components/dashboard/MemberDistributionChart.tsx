import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Users } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface MemberDistributionChartProps {
  accessibleGroupIds?: string[];
  isGlobalAccess?: boolean;
}

export default function MemberDistributionChart({ accessibleGroupIds, isGlobalAccess }: MemberDistributionChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        let query = supabase
          .from('groups')
          .select('id, name, members(count)');

        if (!isGlobalAccess && accessibleGroupIds && accessibleGroupIds.length > 0) {
          query = query.in('id', accessibleGroupIds);
        }

        const { data: groups } = await query;

        if (groups) {
          const colors = [
            'hsl(var(--primary))',
            'hsl(var(--info))',
            'hsl(var(--success))',
            'hsl(var(--warning))',
            'hsl(var(--destructive))',
            'hsl(var(--accent))',
          ];

          const data: ChartData[] = (groups as unknown as Array<{ name: string; members?: { count: number }[] | null }>).map((group, index) => ({
            name: group.name,
            value: group.members?.[0]?.count || 0,
            fill: colors[index % colors.length],
          })).filter((item: ChartData) => item.value > 0);

          setChartData(data);
        }
      } catch (error) {
        console.error('Error fetching member data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberData();
  }, [accessibleGroupIds, isGlobalAccess]);

  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.name] = {
      label: item.name,
      color: item.fill,
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const CustomLegend = ({ payload }: { payload?: Array<{ color: string; value: string }> }) => (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload?.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5 text-xs">
          <div 
            className="h-3 w-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          توزيع الأعضاء
        </CardTitle>
        <CardDescription>توزيع الأعضاء على الأفواج</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <p>جارٍ التحميل...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <p>لا توجد بيانات</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-2 shadow-lg">
                        <p className="font-medium">{payload[0].name}</p>
                        <p className="text-sm text-muted-foreground">{payload[0].value} عضو</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
