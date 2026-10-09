-- Add opening_speech fields to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS opening_speech_title text,
ADD COLUMN IF NOT EXISTS opening_speech_content text,
ADD COLUMN IF NOT EXISTS opening_speech_presenter text;

-- Add content and presenter fields to lessons table
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS presenter text;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_meeting_id ON public.lessons(meeting_id);