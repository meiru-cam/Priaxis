export const MODAL_FORM_TOKENS = {
  formGap: '8px',
  formRowGap: '12px',
  formGroupGap: '6px',
  sectionPadding: '12px',
  sectionMarginBottom: '0px',
  sectionTitleMarginBottom: '8px',
  sectionTopMargin: '6px',
  sectionTopPadding: '10px',
  inlineFieldSpacing: '8px',
  radioGroupGap: '12px',
} as const;

export type ModalFormToken = keyof typeof MODAL_FORM_TOKENS;
