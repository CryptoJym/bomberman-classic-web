/**
 * Chat Reports Table Migration
 * Creates table for storing chat message reports
 */

-- Create chat_reports table
CREATE TABLE IF NOT EXISTS chat_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'inappropriate', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_chat_reports_message_id ON chat_reports(message_id);
CREATE INDEX idx_chat_reports_reported_user_id ON chat_reports(reported_user_id);
CREATE INDEX idx_chat_reports_reporter_id ON chat_reports(reporter_id);
CREATE INDEX idx_chat_reports_status ON chat_reports(status);
CREATE INDEX idx_chat_reports_created_at ON chat_reports(created_at DESC);

-- Create composite index for duplicate check
CREATE UNIQUE INDEX idx_chat_reports_unique ON chat_reports(message_id, reporter_id) WHERE status != 'dismissed';

-- Enable RLS
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can insert their own reports
CREATE POLICY chat_reports_insert_own ON chat_reports
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
  ));

-- Users can view their own reports
CREATE POLICY chat_reports_select_own ON chat_reports
  FOR SELECT
  USING (
    reporter_id IN (
      SELECT id FROM profiles WHERE clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins can view all reports (TODO: Add admin check)
CREATE POLICY chat_reports_select_admin ON chat_reports
  FOR SELECT
  USING (
    -- This should check for admin role, but for now allow all authenticated users
    -- In production, add proper admin role check here
    true
  );

-- Admins can update reports (TODO: Add admin check)
CREATE POLICY chat_reports_update_admin ON chat_reports
  FOR UPDATE
  USING (
    -- This should check for admin role
    -- In production, add proper admin role check here
    true
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_reports_updated_at
  BEFORE UPDATE ON chat_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_reports_updated_at();

-- Add comments for documentation
COMMENT ON TABLE chat_reports IS 'Stores reports of inappropriate chat messages';
COMMENT ON COLUMN chat_reports.message_id IS 'Reference to the reported message';
COMMENT ON COLUMN chat_reports.reported_user_id IS 'User who sent the reported message';
COMMENT ON COLUMN chat_reports.reporter_id IS 'User who filed the report';
COMMENT ON COLUMN chat_reports.reason IS 'Category of the report';
COMMENT ON COLUMN chat_reports.details IS 'Additional context provided by reporter';
COMMENT ON COLUMN chat_reports.status IS 'Current status of the report';
COMMENT ON COLUMN chat_reports.reviewed_by IS 'Admin/moderator who reviewed the report';
COMMENT ON COLUMN chat_reports.reviewed_at IS 'When the report was reviewed';
COMMENT ON COLUMN chat_reports.action_taken IS 'Description of moderation action taken';
