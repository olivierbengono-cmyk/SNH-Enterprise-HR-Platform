/*
  # Correction des managers manquants pour DCO, DFI, DG, DRH, JUR

  Les directeurs existants n'avaient pas été liés dans la colonne manager_id
  des départements lors de la migration précédente. Ce script corrige cela.
*/

UPDATE departments SET manager_id = '69fcb373-5e0c-42b3-b2c3-488725cbef9c'
  WHERE id = '69c34d8f-16d3-4fcf-b21b-fb06f6a14b2c'; -- DCO → Ulrich Foe

UPDATE departments SET manager_id = '5bd5ed1e-014b-4a7c-b3af-88da0b79bcc1'
  WHERE id = '54f457e3-a16e-47d4-aabe-98a6505b9795'; -- DFI → Alain Kamga

UPDATE departments SET manager_id = '05fbe4ed-0a17-4eee-b040-1da4bf7284bb'
  WHERE id = '7536b61b-3289-4a51-b706-d1063677a284'; -- DG → Jean-Pierre Mbarga

UPDATE departments SET manager_id = 'a4593f7d-482a-472d-abe4-6c388b53cbc2'
  WHERE id = '4b54f692-e074-47c2-b12d-3c5568ba4fce'; -- DRH → Paul Nkotto

UPDATE departments SET manager_id = '0d9e09bf-6dcf-45f9-8ac5-032b50b67477'
  WHERE id = '040b3433-3949-4ef4-a849-78eb6ab9cc95'; -- JUR → Hervé Nkolo Foe
