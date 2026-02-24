-- Insert new keys for Grace Period into system_settings table
INSERT INTO public.system_settings (key, value, category, description)
VALUES 
  ('allow_grace_period', 'false', 'general', 'Cho phép thời gian đi trễ (Grace Period)'),
  ('grace_period_minutes', '5', 'general', 'Số phút tối đa cho phép đi trễ');
