import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CandidatePortal from './components/cvtheque/CandidatePortal';
import './index.css';

createRoot(document.getElementById('portal-root')!).render(
  <StrictMode>
    <CandidatePortal />
  </StrictMode>
);
