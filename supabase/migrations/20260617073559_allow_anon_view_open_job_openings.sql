-- Allow anonymous users to view open job offers on the public portal
CREATE POLICY "Public can view open job openings"
  ON job_openings FOR SELECT
  TO anon
  USING (status = 'open');
