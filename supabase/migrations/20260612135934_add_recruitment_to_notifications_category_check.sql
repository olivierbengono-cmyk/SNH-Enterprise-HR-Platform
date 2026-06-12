-- Expand notifications category_check to include 'recruitment'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (category = ANY (ARRAY[
    'leave', 'payroll', 'training', 'performance',
    'system', 'other', 'recruitment', 'qvct', 'document'
  ]));