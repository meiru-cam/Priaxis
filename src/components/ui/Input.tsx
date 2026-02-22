/**
 * Input and Textarea Components
 * Styled form inputs with consistent theming
 */

import styled, { css } from 'styled-components';
import { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fullWidth?: boolean;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
  minRows?: number;
}

const baseInputStyles = css<{ $error?: boolean; $fullWidth?: boolean }>`
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  padding: 12px;
  background: ${({ theme }) => theme.colors.input.bg};
  border: 1px solid ${({ theme, $error }) =>
    $error ? theme.colors.status.danger.border : theme.colors.input.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 1em;
  font-family: inherit;
  transition: all 0.3s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.input.placeholder};
    opacity: 0.8;
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $error }) =>
      $error ? theme.colors.status.danger.border : theme.colors.accent.purple};
    box-shadow: 0 0 0 3px ${({ $error }) =>
      $error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const resolveInputAutoComplete = (props: React.InputHTMLAttributes<HTMLInputElement>): string => {
  if (typeof props.autoComplete === 'string' && props.autoComplete.trim().length > 0) {
    return props.autoComplete;
  }
  const type = props.type?.toLowerCase();
  if (!type || type === 'text' || type === 'search' || type === 'email' || type === 'url') {
    return 'on';
  }
  if (type === 'password') {
    return 'current-password';
  }
  if (type === 'tel') {
    return 'tel';
  }
  return 'off';
};

export const ImeSafeInputBase = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ onKeyDown, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const resolvedId = props.id ?? `input-${generatedId}`;
    const resolvedName = props.name ?? resolvedId;
    const resolvedAriaLabel =
      props['aria-label']
      ?? (typeof props.placeholder === 'string' ? props.placeholder : undefined)
      ?? (typeof props.title === 'string' ? props.title : undefined)
      ?? resolvedName;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const nativeEvent = e.nativeEvent as KeyboardEvent;
      const isComposing = nativeEvent.isComposing || nativeEvent.keyCode === 229;
      if (isComposing && e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
    };

    return (
      <input
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        autoComplete={resolveInputAutoComplete(props)}
        aria-label={resolvedAriaLabel}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

ImeSafeInputBase.displayName = 'ImeSafeInputBase';

export const ImeSafeTextareaBase = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ onKeyDown, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const resolvedId = props.id ?? `textarea-${generatedId}`;
    const resolvedName = props.name ?? resolvedId;
    const resolvedAriaLabel =
      props['aria-label']
      ?? (typeof props.placeholder === 'string' ? props.placeholder : undefined)
      ?? (typeof props.title === 'string' ? props.title : undefined)
      ?? resolvedName;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const nativeEvent = e.nativeEvent as KeyboardEvent;
      const isComposing = nativeEvent.isComposing || nativeEvent.keyCode === 229;
      if (isComposing && e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
    };

    return (
      <textarea
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        autoComplete={props.autoComplete ?? 'on'}
        aria-label={resolvedAriaLabel}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

ImeSafeTextareaBase.displayName = 'ImeSafeTextareaBase';

const StyledInput = styled(ImeSafeInputBase)<{ $error?: boolean; $fullWidth?: boolean }>`
  ${baseInputStyles}
`;

const StyledTextarea = styled(ImeSafeTextareaBase)<{ $error?: boolean; $fullWidth?: boolean }>`
  ${baseInputStyles}
  min-height: 100px;
  line-height: 1.6;
  resize: vertical;
`;

const InputWrapper = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorMessage = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.status.danger.text};
`;

const HelperText = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// Input with label and error support
interface InputFieldProps extends InputProps {
  label?: string;
  errorMessage?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, fullWidth = true, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const resolvedId = props.id ?? `input-${generatedId}`;
    const resolvedName = props.name ?? resolvedId;
    const resolvedAriaLabel =
      props['aria-label']
      ?? (typeof props.placeholder === 'string' ? props.placeholder : undefined)
      ?? (typeof props.title === 'string' ? props.title : undefined)
      ?? resolvedName;

    return (
      <StyledInput
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        autoComplete={resolveInputAutoComplete(props)}
        aria-label={resolvedAriaLabel}
        $error={error}
        $fullWidth={fullWidth}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, errorMessage, helperText, error, fullWidth = true, id, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const inputId = id ?? `input-field-${generatedId}`;
    const hasError = error || !!errorMessage;

    return (
      <InputWrapper $fullWidth={fullWidth}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <StyledInput
          ref={ref}
          id={inputId}
          $error={hasError}
          $fullWidth={fullWidth}
          {...props}
        />
        {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        {helperText && !errorMessage && <HelperText>{helperText}</HelperText>}
      </InputWrapper>
    );
  }
);

InputField.displayName = 'InputField';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, fullWidth = true, minRows = 3, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const resolvedId = props.id ?? `textarea-${generatedId}`;
    const resolvedName = props.name ?? resolvedId;
    const resolvedAriaLabel =
      props['aria-label']
      ?? (typeof props.placeholder === 'string' ? props.placeholder : undefined)
      ?? (typeof props.title === 'string' ? props.title : undefined)
      ?? resolvedName;

    return (
      <StyledTextarea
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        autoComplete={props.autoComplete ?? 'on'}
        aria-label={resolvedAriaLabel}
        $error={error}
        $fullWidth={fullWidth}
        style={{ minHeight: `${minRows * 1.6 + 1.5}em` }}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// Textarea with label and error support
interface TextareaFieldProps extends TextareaProps {
  label?: string;
  errorMessage?: string;
  helperText?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, errorMessage, helperText, error, fullWidth = true, id, minRows = 3, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const textareaId = id ?? `textarea-field-${generatedId}`;
    const hasError = error || !!errorMessage;

    return (
      <InputWrapper $fullWidth={fullWidth}>
        {label && <Label htmlFor={textareaId}>{label}</Label>}
        <StyledTextarea
          ref={ref}
          id={textareaId}
          $error={hasError}
          $fullWidth={fullWidth}
          style={{ minHeight: `${minRows * 1.6 + 1.5}em` }}
          {...props}
        />
        {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        {helperText && !errorMessage && <HelperText>{helperText}</HelperText>}
      </InputWrapper>
    );
  }
);

TextareaField.displayName = 'TextareaField';

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  fullWidth?: boolean;
}

const StyledSelect = styled.select<{ $error?: boolean; $fullWidth?: boolean }>`
  ${baseInputStyles}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
`;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, fullWidth = true, children, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const resolvedId = props.id ?? `select-${generatedId}`;
    const resolvedName = props.name ?? resolvedId;
    const resolvedAriaLabel =
      props['aria-label']
      ?? (typeof props.title === 'string' ? props.title : undefined)
      ?? resolvedName;

    return (
      <StyledSelect
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        aria-label={resolvedAriaLabel}
        $error={error}
        $fullWidth={fullWidth}
        {...props}
      >
        {children}
      </StyledSelect>
    );
  }
);

Select.displayName = 'Select';

export default Input;
