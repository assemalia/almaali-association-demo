-- إضافة قيمة جديدة للـ enum (مسؤول الاشتراكات)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'subscription_manager';