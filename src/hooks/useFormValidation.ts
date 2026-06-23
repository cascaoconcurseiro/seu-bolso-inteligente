import { useState, useRef, useCallback, useEffect } from "react";

interface FieldState {
  error: string;
  touched: boolean;
}

interface UseFormValidationOptions {
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function useFormValidation(initialErrors: Record<string, string> = {}, options: UseFormValidationOptions = {}) {
  const { validateOnBlur = false, validateOnChange = false } = options;
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const clearFieldError = useCallback((name: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const touchField = useCallback((name: string) => {
    setFields(prev => ({
      ...prev,
      [name]: { ...prev[name], touched: true, error: errors[name] || "" },
    }));
  }, [errors]);

  const setValidationErrors = useCallback((newErrors: Record<string, string>) => {
    setErrors(newErrors);
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  const getFieldProps = useCallback((name: string) => {
    const fieldState = fields[name];
    return {
      name,
      "data-error": !!errors[name],
      onBlur: validateOnBlur ? () => touchField(name) : undefined,
      onChange: validateOnChange
        ? undefined
        : undefined,
    };
  }, [fields, errors, touchField, validateOnBlur, validateOnChange]);

  const handleBlur = useCallback((name: string) => {
    touchField(name);
  }, [touchField]);

  const focusFirstError = useCallback(() => {
    if (!formRef.current) return;
    const firstErrorKey = Object.keys(errors)[0];
    if (!firstErrorKey) return;

    const el = formRef.current.querySelector<HTMLElement>(
      `[name="${firstErrorKey}"], #${firstErrorKey}`
    );
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.select();
      }
    }
  }, [errors]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  useEffect(() => {
    setErrors(initialErrors);
  }, [initialErrors]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    setValidationErrors,
    hasErrors,
    focusFirstError,
    clearErrors,
    formRef,
    getFieldProps,
    handleBlur,
    touchField,
  };
}
