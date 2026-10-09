import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF, { type TextOptionsLight } from 'jspdf';
import autoTable from 'jspdf-autotable';

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface DashboardPdfExportProps {
  accessibleGroupIds: string[];
  isGlobalAccess: boolean;
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalGroups: number;
    attendanceRate: number;
    unpaidSubscriptions: number;
  };
}

interface ExportOptions {
  includeStats: boolean;
  includeGroups: boolean;
  includeMembers: boolean;
  includeMeetings: boolean;
  includeUnpaidSubscriptions: boolean;
  includeAttendanceChart: boolean;
  dateRange: 'week' | 'month' | 'quarter' | 'year';
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

// Arabic font base64 will be loaded dynamically
let amiriRegularBase64: string | null = null;
let amiriBoldBase64: string | null = null;

async function loadArabicFont(): Promise<void> {
  if (amiriRegularBase64 && amiriBoldBase64) return;

  try {
    // Load regular font
    const regularResponse = await fetch('/fonts/Amiri-Regular.ttf');
    const regularBuffer = await regularResponse.arrayBuffer();
    amiriRegularBase64 = btoa(
      new Uint8Array(regularBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Load bold font
    const boldResponse = await fetch('/fonts/Amiri-Bold.ttf');
    const boldBuffer = await boldResponse.arrayBuffer();
    amiriBoldBase64 = btoa(
      new Uint8Array(boldBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
  } catch (error) {
    console.error('Error loading Arabic font:', error);
    throw new Error('فشل في تحميل الخط العربي');
  }
}

export default function DashboardPdfExport({ 
  accessibleGroupIds, 
  isGlobalAccess,
  stats 
}: DashboardPdfExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeStats: true,
    includeGroups: true,
    includeMembers: true,
    includeMeetings: true,
    includeUnpaidSubscriptions: true,
    includeAttendanceChart: false,
    dateRange: 'month',
    paperSize: 'a4',
    orientation: 'portrait',
  });

  const getDateRangeFilter = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch (options.dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return startDate.toISOString().split('T')[0];
  };

  const getDateRangeLabel = () => {
    switch (options.dateRange) {
      case 'week': return 'آخر أسبوع';
      case 'month': return 'آخر شهر';
      case 'quarter': return 'آخر 3 أشهر';
      case 'year': return 'آخر سنة';
    }
  };

  const exportToPdf = async () => {
    setIsExporting(true);
    try {
      // Load Arabic font first
      await loadArabicFont();

      // Create PDF document
      const doc = new jsPDF({
        orientation: options.orientation,
        unit: 'mm',
        format: options.paperSize,
      });
      
      // Add Arabic font
      if (amiriRegularBase64 && amiriBoldBase64) {
        doc.addFileToVFS('Amiri-Regular.ttf', amiriRegularBase64);
        doc.addFileToVFS('Amiri-Bold.ttf', amiriBoldBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
        doc.setFont('Amiri');
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let yPos = 20;

      // Helper function to add RTL text
      const addRtlText = (text: string, x: number, y: number, options?: TextOptionsLight) => {
        doc.text(text, x, y, { align: 'right', ...options });
      };

      // Helper function to check and add new page
      const checkNewPage = (requiredSpace: number = 40) => {
        if (yPos > pageHeight - requiredSpace) {
          doc.addPage();
          yPos = 20;
        }
      };

      // ===== Header Section =====
      doc.setFillColor(27, 94, 32); // Islamic green
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('Amiri', 'bold');
      addRtlText('تقرير لوحة التحكم', pageWidth - margin, 18);
      
      doc.setFontSize(12);
      doc.setFont('Amiri', 'normal');
      const today = new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      addRtlText(today, pageWidth - margin, 28);
      
      // Date range indicator
      doc.setFillColor(212, 175, 55); // Gold accent
      doc.rect(margin, 10, 40, 15, 'F');
      doc.setTextColor(27, 94, 32);
      doc.setFontSize(10);
      doc.text(getDateRangeLabel(), margin + 20, 19, { align: 'center' });

      yPos = 50;
      doc.setTextColor(0, 0, 0);

      // ===== Statistics Section =====
      if (options.includeStats) {
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin, yPos - 5, pageWidth - (margin * 2), 45, 3, 3, 'F');
        
        doc.setFontSize(16);
        doc.setFont('Amiri', 'bold');
        doc.setTextColor(27, 94, 32);
        addRtlText('الإحصائيات العامة', pageWidth - margin - 5, yPos + 5);
        
        yPos += 15;
        doc.setFont('Amiri', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);

        const statsData = [
          { label: 'إجمالي الأعضاء', value: stats.totalMembers },
          { label: 'الأعضاء النشطون', value: stats.activeMembers },
          { label: 'عدد الأفواج', value: stats.totalGroups },
          { label: 'نسبة الحضور', value: `${stats.attendanceRate}%` },
          { label: 'اشتراكات غير مدفوعة', value: stats.unpaidSubscriptions },
        ];

        const colWidth = (pageWidth - (margin * 2)) / 5;
        statsData.forEach((stat, index) => {
          const x = pageWidth - margin - (index * colWidth) - (colWidth / 2);
          doc.setFontSize(18);
          doc.setFont('Amiri', 'bold');
          doc.setTextColor(27, 94, 32);
          doc.text(stat.value.toString(), x, yPos + 8, { align: 'center' });
          
          doc.setFontSize(9);
          doc.setFont('Amiri', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(stat.label, x, yPos + 16, { align: 'center' });
        });

        yPos += 45;
      }

      // Fetch data based on options
      const startDate = getDateRangeFilter();

      // ===== Groups Section =====
      if (options.includeGroups) {
        checkNewPage(60);
        
        let groupsQuery = supabase
          .from('groups')
          .select('id, name, monthly_fee')
          .order('name');

        if (!isGlobalAccess && accessibleGroupIds.length > 0) {
          groupsQuery = groupsQuery.in('id', accessibleGroupIds);
        }

        const { data: groups } = await groupsQuery;

        if (groups && groups.length > 0) {
          doc.setFontSize(14);
          doc.setFont('Amiri', 'bold');
          doc.setTextColor(27, 94, 32);
          addRtlText('الأفواج التربوية', pageWidth - margin, yPos);
          yPos += 5;

          autoTable(doc, {
            startY: yPos,
            head: [['الرسوم الشهرية', 'اسم الفوج']],
            body: groups.map(g => [
              g.monthly_fee ? `${g.monthly_fee} د.ج` : '-',
              g.name
            ]),
            styles: { 
              font: 'Amiri',
              halign: 'right',
              fontSize: 10,
              cellPadding: 4,
            },
            headStyles: {
              fillColor: [27, 94, 32],
              textColor: [255, 255, 255],
              halign: 'right',
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [245, 250, 245],
            },
            margin: { right: margin, left: margin },
          });

          yPos = (doc as AutoTableDoc).lastAutoTable.finalY + 15;
        }
      }

      // ===== Members Section =====
      if (options.includeMembers) {
        checkNewPage(60);

        let membersQuery = supabase
          .from('members')
          .select(`
            id,
            first_name,
            last_name,
            status,
            phone,
            groups(name)
          `)
          .order('first_name');

        if (!isGlobalAccess && accessibleGroupIds.length > 0) {
          membersQuery = membersQuery.in('group_id', accessibleGroupIds);
        }

        const { data: members } = await membersQuery;

        if (members && members.length > 0) {
          doc.setFontSize(14);
          doc.setFont('Amiri', 'bold');
          doc.setTextColor(27, 94, 32);
          addRtlText('قائمة الأعضاء', pageWidth - margin, yPos);
          yPos += 5;

          autoTable(doc, {
            startY: yPos,
            head: [['الحالة', 'الفوج', 'رقم الهاتف', 'الاسم الكامل']],
            body: members.map(m => [
              m.status === 'active' ? 'نشط' : 'غير نشط',
              (m.groups as unknown as { name?: string } | null)?.name || '-',
              m.phone || '-',
              `${m.first_name} ${m.last_name}`
            ]),
            styles: { 
              font: 'Amiri',
              halign: 'right',
              fontSize: 9,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [27, 94, 32],
              textColor: [255, 255, 255],
              halign: 'right',
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [245, 250, 245],
            },
            columnStyles: {
              0: { cellWidth: 25 },
              1: { cellWidth: 35 },
              2: { cellWidth: 35 },
              3: { cellWidth: 'auto' },
            },
            margin: { right: margin, left: margin },
          });

          yPos = (doc as AutoTableDoc).lastAutoTable.finalY + 15;
        }
      }

      // ===== Meetings Section =====
      if (options.includeMeetings) {
        checkNewPage(60);

        let meetingsQuery = supabase
          .from('meetings')
          .select('id, title, meeting_date, groups(name)')
          .gte('meeting_date', startDate)
          .order('meeting_date', { ascending: false })
          .limit(20);

        if (!isGlobalAccess && accessibleGroupIds.length > 0) {
          meetingsQuery = meetingsQuery.in('group_id', accessibleGroupIds);
        }

        const { data: meetings } = await meetingsQuery;

        if (meetings && meetings.length > 0) {
          doc.setFontSize(14);
          doc.setFont('Amiri', 'bold');
          doc.setTextColor(27, 94, 32);
          addRtlText('اللقاءات الأخيرة', pageWidth - margin, yPos);
          yPos += 5;

          autoTable(doc, {
            startY: yPos,
            head: [['الفوج', 'التاريخ', 'العنوان']],
            body: meetings.map(m => [
              (m.groups as unknown as { name?: string } | null)?.name || '-',
              new Date(m.meeting_date).toLocaleDateString('ar-SA'),
              m.title
            ]),
            styles: { 
              font: 'Amiri',
              halign: 'right',
              fontSize: 9,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [27, 94, 32],
              textColor: [255, 255, 255],
              halign: 'right',
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [245, 250, 245],
            },
            margin: { right: margin, left: margin },
          });

          yPos = (doc as AutoTableDoc).lastAutoTable.finalY + 15;
        }
      }

      // ===== Unpaid Subscriptions Section =====
      if (options.includeUnpaidSubscriptions && stats.unpaidSubscriptions > 0) {
        checkNewPage(60);

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const { data: unpaidSubs } = await supabase
          .from('subscriptions')
          .select(`
            id,
            amount,
            month,
            year,
            members(first_name, last_name, groups(name))
          `)
          .eq('is_paid', false)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        if (unpaidSubs && unpaidSubs.length > 0) {
          doc.setFontSize(14);
          doc.setFont('Amiri', 'bold');
          doc.setTextColor(220, 53, 69);
          addRtlText('الاشتراكات غير المدفوعة', pageWidth - margin, yPos);
          yPos += 5;

          autoTable(doc, {
            startY: yPos,
            head: [['المبلغ', 'الفوج', 'اسم العضو']],
            body: unpaidSubs.map(s => [
              `${s.amount} د.ج`,
              (s.members as unknown as { groups?: { name?: string } | null } | null)?.groups?.name || '-',
              `${(s.members as unknown as { first_name?: string; last_name?: string } | null)?.first_name} ${(s.members as unknown as { first_name?: string; last_name?: string } | null)?.last_name}`
            ]),
            styles: { 
              font: 'Amiri',
              halign: 'right',
              fontSize: 9,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [220, 53, 69],
              textColor: [255, 255, 255],
              halign: 'right',
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [255, 245, 245],
            },
            margin: { right: margin, left: margin },
          });

          yPos = (doc as AutoTableDoc).lastAutoTable.finalY + 15;
        }
      }

      // ===== Footer on all pages =====
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(27, 94, 32);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        // Footer text
        doc.setFontSize(8);
        doc.setFont('Amiri', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(
          `صفحة ${i} من ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
        
        // Generated timestamp
        doc.text(
          `تم الإنشاء: ${new Date().toLocaleString('ar-SA')}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: 'right' }
        );
      }

      // Save the PDF
      const fileName = `تقرير-لوحة-التحكم-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      setIsDialogOpen(false);
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileDown className="h-4 w-4" />
          تصدير PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            خيارات تصدير التقرير
          </DialogTitle>
          <DialogDescription>
            اختر محتويات التقرير وإعدادات التصدير
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content Selection */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">محتوى التقرير</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="stats"
                  checked={options.includeStats}
                  onCheckedChange={(checked) => updateOption('includeStats', !!checked)}
                />
                <Label htmlFor="stats" className="cursor-pointer">الإحصائيات العامة</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="groups"
                  checked={options.includeGroups}
                  onCheckedChange={(checked) => updateOption('includeGroups', !!checked)}
                />
                <Label htmlFor="groups" className="cursor-pointer">الأفواج التربوية</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="members"
                  checked={options.includeMembers}
                  onCheckedChange={(checked) => updateOption('includeMembers', !!checked)}
                />
                <Label htmlFor="members" className="cursor-pointer">قائمة الأعضاء</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="meetings"
                  checked={options.includeMeetings}
                  onCheckedChange={(checked) => updateOption('includeMeetings', !!checked)}
                />
                <Label htmlFor="meetings" className="cursor-pointer">اللقاءات الأخيرة</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="unpaid"
                  checked={options.includeUnpaidSubscriptions}
                  onCheckedChange={(checked) => updateOption('includeUnpaidSubscriptions', !!checked)}
                />
                <Label htmlFor="unpaid" className="cursor-pointer">الاشتراكات غير المدفوعة</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">الفترة الزمنية</h4>
            <Select
              value={options.dateRange}
              onValueChange={(value) => updateOption('dateRange', value as ExportOptions['dateRange'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
                <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
                <SelectItem value="year">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Page Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">إعدادات الصفحة</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">حجم الورق</Label>
                <Select
                  value={options.paperSize}
                  onValueChange={(value) => updateOption('paperSize', value as ExportOptions['paperSize'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">اتجاه الصفحة</Label>
                <Select
                  value={options.orientation}
                  onValueChange={(value) => updateOption('orientation', value as ExportOptions['orientation'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">عمودي</SelectItem>
                    <SelectItem value="landscape">أفقي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={exportToPdf} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                تصدير التقرير
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
