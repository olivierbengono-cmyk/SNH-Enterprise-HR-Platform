/*
  # Create QVCT Discussions and AI Analysis System

  ## Overview
  System for workplace discussions with AI-powered analysis and insights

  ## New Tables
  
  ### 1. `qvct_discussion_threads` - Discussion topics
  ### 2. `qvct_discussion_messages` - Messages in discussions
  ### 3. `qvct_discussion_analysis` - AI analysis of discussions

  ## Security
  - Enable RLS on all tables
  - All employees can view and participate in discussions
  - Anonymous posting option for sensitive topics
*/

-- Create qvct_discussion_threads table
CREATE TABLE IF NOT EXISTS qvct_discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('conditions_travail', 'relations', 'organisation', 'sante', 'autre')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  created_by uuid REFERENCES employees(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Create qvct_discussion_messages table
CREATE TABLE IF NOT EXISTS qvct_discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES qvct_discussion_threads(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES employees(id) NOT NULL,
  message text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create qvct_discussion_analysis table
CREATE TABLE IF NOT EXISTS qvct_discussion_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES qvct_discussion_threads(id) ON DELETE CASCADE NOT NULL,
  summary text NOT NULL,
  key_themes jsonb DEFAULT '[]'::jsonb,
  sentiment text NOT NULL CHECK (sentiment IN ('overall', 'positive', 'neutral', 'negative')),
  proposed_actions jsonb DEFAULT '[]'::jsonb,
  qvct_topics jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES employees(id) NOT NULL
);

-- Enable RLS
ALTER TABLE qvct_discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qvct_discussion_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qvct_discussion_threads
CREATE POLICY "All employees can view discussion threads"
  ON qvct_discussion_threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All employees can create discussion threads"
  ON qvct_discussion_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_threads.created_by
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Thread creator and HR can update threads"
  ON qvct_discussion_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_threads.created_by
      AND user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

CREATE POLICY "HR can delete threads"
  ON qvct_discussion_threads FOR DELETE
  TO authenticated
  USING (is_hr_or_manager());

-- RLS Policies for qvct_discussion_messages
CREATE POLICY "All employees can view messages"
  ON qvct_discussion_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All employees can post messages"
  ON qvct_discussion_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_messages.author_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Message author can update own messages"
  ON qvct_discussion_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_messages.author_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Message author and HR can delete messages"
  ON qvct_discussion_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = qvct_discussion_messages.author_id
      AND user_id = auth.uid()
    )
    OR is_hr_or_manager()
  );

-- RLS Policies for qvct_discussion_analysis
CREATE POLICY "All employees can view analysis"
  ON qvct_discussion_analysis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and HR can create analysis"
  ON qvct_discussion_analysis FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_or_manager());

CREATE POLICY "HR can delete analysis"
  ON qvct_discussion_analysis FOR DELETE
  TO authenticated
  USING (is_hr_or_manager());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_threads_status ON qvct_discussion_threads(status);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_threads_category ON qvct_discussion_threads(category);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_threads_created_by ON qvct_discussion_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_messages_thread_id ON qvct_discussion_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_messages_author_id ON qvct_discussion_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_qvct_discussion_analysis_thread_id ON qvct_discussion_analysis(thread_id);

-- Create function to update thread updated_at timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qvct_discussion_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update thread timestamp when new message is posted
DROP TRIGGER IF EXISTS update_thread_on_new_message ON qvct_discussion_messages;
CREATE TRIGGER update_thread_on_new_message
  AFTER INSERT ON qvct_discussion_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();