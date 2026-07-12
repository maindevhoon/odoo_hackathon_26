-- ============================================================
-- 0004_contracts.sql  — Contracts + Driver Progress
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES auth.users(id),
  title         text NOT NULL,
  vehicle_class text NOT NULL,
  cargo_type    text NOT NULL,
  region        text NOT NULL,
  min_tier      text NOT NULL CHECK (min_tier IN ('bronze','silver','gold','platinum')),
  pay           numeric(12,2) NOT NULL CHECK (pay >= 0),
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  driver_id     uuid REFERENCES public.drivers(id),
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','assigned','active','completed','cancelled','breached')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_progress (
  driver_id           uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  xp                  integer NOT NULL DEFAULT 0,
  tier                text NOT NULL DEFAULT 'bronze'
                        CHECK (tier IN ('bronze','silver','gold','platinum')),
  contracts_completed integer NOT NULL DEFAULT 0,
  contracts_breached  integer NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Ensure every existing driver has a progress row
INSERT INTO public.driver_progress (driver_id)
  SELECT id FROM public.drivers
  ON CONFLICT (driver_id) DO NOTHING;

-- ── Trigger: auto-create progress row on new driver ─────────
CREATE OR REPLACE FUNCTION public._ensure_driver_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.driver_progress (driver_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_driver_progress ON public.drivers;
CREATE TRIGGER trg_ensure_driver_progress
  AFTER INSERT ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public._ensure_driver_progress();

-- ── RPC: assign_contract ─────────────────────────────────────
-- Admin assigns a driver to an open contract (tier check)
CREATE OR REPLACE FUNCTION public.assign_contract(
  p_contract_id uuid,
  p_driver_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contract  public.contracts%ROWTYPE;
  v_progress  public.driver_progress%ROWTYPE;
  v_tier_order text[] := ARRAY['bronze','silver','gold','platinum'];
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Contract not found'); END IF;
  IF v_contract.status != 'open' THEN
    RETURN jsonb_build_object('error','Contract is not open');
  END IF;

  SELECT * INTO v_progress FROM public.driver_progress WHERE driver_id = p_driver_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Driver progress not found'); END IF;

  -- Tier gate
  IF array_position(v_tier_order, v_progress.tier)
     < array_position(v_tier_order, v_contract.min_tier) THEN
    RETURN jsonb_build_object('error',
      'Driver tier (' || v_progress.tier || ') does not meet contract minimum (' || v_contract.min_tier || ')');
  END IF;

  UPDATE public.contracts
  SET driver_id  = p_driver_id,
      status     = 'assigned',
      updated_at = now()
  WHERE id = p_contract_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── RPC: complete_contract ────────────────────────────────────
-- Completes contract, awards XP, recomputes tier
CREATE OR REPLACE FUNCTION public.complete_contract(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contract   public.contracts%ROWTYPE;
  v_driver     public.drivers%ROWTYPE;
  v_xp_award   integer;
  v_new_xp     integer;
  v_new_tier   text;
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Contract not found'); END IF;
  IF v_contract.status NOT IN ('assigned','active') THEN
    RETURN jsonb_build_object('error','Contract must be assigned or active to complete');
  END IF;
  IF v_contract.driver_id IS NULL THEN
    RETURN jsonb_build_object('error','No driver assigned');
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE id = v_contract.driver_id;

  -- XP formula: 100 base + safety_score bonus (0-50) capped at 150
  v_xp_award := LEAST(150, 100 + COALESCE(v_driver.safety_score, 0) / 2);

  UPDATE public.contracts SET status = 'completed', updated_at = now() WHERE id = p_contract_id;

  UPDATE public.driver_progress
  SET
    xp                  = xp + v_xp_award,
    contracts_completed = contracts_completed + 1,
    updated_at          = now()
  WHERE driver_id = v_contract.driver_id
  RETURNING xp INTO v_new_xp;

  -- Recompute tier
  v_new_tier := CASE
    WHEN v_new_xp >= 3500 THEN 'platinum'
    WHEN v_new_xp >= 1500 THEN 'gold'
    WHEN v_new_xp >= 500  THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE public.driver_progress
  SET tier = v_new_tier, updated_at = now()
  WHERE driver_id = v_contract.driver_id;

  RETURN jsonb_build_object('ok', true, 'xp_awarded', v_xp_award, 'new_xp', v_new_xp, 'new_tier', v_new_tier);
END;
$$;

-- ── RPC: breach_contract ─────────────────────────────────────
-- Penalizes driver XP on breach/cancel
CREATE OR REPLACE FUNCTION public.breach_contract(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contract  public.contracts%ROWTYPE;
  v_new_xp    integer;
  v_new_tier  text;
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Contract not found'); END IF;
  IF v_contract.status NOT IN ('assigned','active') THEN
    RETURN jsonb_build_object('error','Contract must be assigned or active to breach');
  END IF;

  UPDATE public.contracts SET status = 'breached', updated_at = now() WHERE id = p_contract_id;

  IF v_contract.driver_id IS NOT NULL THEN
    UPDATE public.driver_progress
    SET
      xp                 = GREATEST(0, xp - 75),
      contracts_breached = contracts_breached + 1,
      updated_at         = now()
    WHERE driver_id = v_contract.driver_id
    RETURNING xp INTO v_new_xp;

    v_new_tier := CASE
      WHEN v_new_xp >= 3500 THEN 'platinum'
      WHEN v_new_xp >= 1500 THEN 'gold'
      WHEN v_new_xp >= 500  THEN 'silver'
      ELSE 'bronze'
    END;

    UPDATE public.driver_progress
    SET tier = v_new_tier, updated_at = now()
    WHERE driver_id = v_contract.driver_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── RPC: cancel_contract ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_contract(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.contracts
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_contract_id AND status IN ('open');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','Can only cancel open contracts');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Grants ────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.contracts TO authenticated;
GRANT SELECT, UPDATE ON public.driver_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_contract(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.breach_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_contract(uuid) TO authenticated;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_progress ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read contracts + progress (driver app filters client-side)
DROP POLICY IF EXISTS "contracts_read" ON public.contracts;
CREATE POLICY "contracts_read" ON public.contracts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "contracts_write" ON public.contracts;
CREATE POLICY "contracts_write" ON public.contracts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "driver_progress_read" ON public.driver_progress;
CREATE POLICY "driver_progress_read" ON public.driver_progress
  FOR SELECT TO authenticated USING (true);

-- Enable Realtime on contracts + driver_progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_progress;
