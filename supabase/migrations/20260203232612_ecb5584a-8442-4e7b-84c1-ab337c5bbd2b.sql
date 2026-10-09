-- إضافة سياسة DELETE لجدول profiles للسماح للمستخدمين بحذف ملفاتهم الشخصية والمدراء بحذف أي ملف
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any profile" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));