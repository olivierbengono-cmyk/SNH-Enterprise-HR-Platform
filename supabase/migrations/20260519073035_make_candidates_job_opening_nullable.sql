/*
  # Rendre job_opening_id nullable dans candidates

  La colonne job_opening_id dans candidates était NOT NULL (héritage de l'ancien schéma).
  Dans la nouvelle CVthèque, un candidat peut exister sans être lié à une offre spécifique.
*/
ALTER TABLE candidates ALTER COLUMN job_opening_id DROP NOT NULL;
