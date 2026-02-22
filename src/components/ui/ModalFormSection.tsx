import styled from 'styled-components';
import { MODAL_FORM_TOKENS } from '../../styles/modalFormTokens';

export const ModalFormSection = styled.section`
  margin-bottom: ${MODAL_FORM_TOKENS.sectionMarginBottom};
  background: rgba(0, 0, 0, 0.02);
  padding: ${MODAL_FORM_TOKENS.sectionPadding};
  border-radius: 8px;
`;

export const ModalFormSectionTitle = styled.div`
  margin-bottom: ${MODAL_FORM_TOKENS.sectionTitleMarginBottom};
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
`;

export const ModalFormDividerSection = styled.section`
  margin-top: ${MODAL_FORM_TOKENS.sectionTopMargin};
  border-top: 1px solid #eee;
  padding-top: ${MODAL_FORM_TOKENS.sectionTopPadding};
`;

