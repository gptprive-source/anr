-- Table des abonnements (avec reconduction tacite)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habitation_id UUID REFERENCES habitations(id),
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL, -- active, canceled, past_due, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des commandes de Domings
CREATE TABLE doming_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anr_id UUID REFERENCES anrs(id) NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price INTEGER DEFAULT 700 NOT NULL, -- 7€ en centimes
  total_price INTEGER NOT NULL,
  is_free BOOLEAN DEFAULT false, -- Doming gratuit inclus
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, paid, shipped, delivered
  shipping_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doming_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert subscriptions"
ON subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
ON subscriptions FOR UPDATE
USING (true);

-- RLS policies for doming_orders
CREATE POLICY "Users can view their own doming orders"
ON doming_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert doming orders"
ON doming_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update doming orders"
ON doming_orders FOR UPDATE
USING (true);

-- Trigger to update updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();