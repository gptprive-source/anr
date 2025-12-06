-- Table for visitor custom message templates
CREATE TABLE visitor_custom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  icon text DEFAULT '📝',
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast device lookup
CREATE INDEX idx_visitor_custom_templates_device ON visitor_custom_templates(device_id);

-- Enable RLS
ALTER TABLE visitor_custom_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access for non-authenticated visitors)
CREATE POLICY "Anyone can view templates" ON visitor_custom_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can create templates" ON visitor_custom_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update templates" ON visitor_custom_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete templates" ON visitor_custom_templates FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_visitor_custom_templates_updated_at
BEFORE UPDATE ON visitor_custom_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();