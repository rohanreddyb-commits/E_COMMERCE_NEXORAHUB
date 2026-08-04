'use client';

import React, { useState } from 'react';
import { addressService } from '@/services';
import { ApiError } from '@/lib/apiClient';
import { Button, Field, Input, Select } from '@/components/ui/Primitives';
import type { Address, AddressPayload } from '@/types/api';

interface AddressFormProps {
  /** Provide to edit; omit to create. */
  address?: Address | null;
  onSaved: (address: Address) => void;
  onCancel: () => void;
  /** Rendered inside a modal that supplies its own footer buttons. */
  formId?: string;
  hideActions?: boolean;
  onSubmittingChange?: (submitting: boolean) => void;
}

const EMPTY: AddressPayload = {
  first_name: '',
  last_name: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  type: 'Shipping',
  title: '',
  is_default: false,
};

/** Validation mirrors backend addressValidation in customer.address.routes.ts. */
const validate = (values: AddressPayload): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!values.first_name.trim()) errors.first_name = 'First name is required.';
  if (!values.last_name.trim()) errors.last_name = 'Last name is required.';
  if (!values.phone.trim()) errors.phone = 'Phone number is required.';
  else if (!/^[+]?[\d\s()-]{7,20}$/.test(values.phone.trim()))
    errors.phone = 'Enter a valid phone number.';
  if (!values.street.trim()) errors.street = 'Street address is required.';
  if (!values.city.trim()) errors.city = 'City is required.';
  if (!values.state.trim()) errors.state = 'State is required.';
  if (!values.postal_code.trim()) errors.postal_code = 'Postal code is required.';
  return errors;
};

export const AddressForm: React.FC<AddressFormProps> = ({
  address,
  onSaved,
  onCancel,
  formId = 'address-form',
  hideActions = false,
  onSubmittingChange,
}) => {
  const [values, setValues] = useState<AddressPayload>(
    address
      ? {
          first_name: address.first_name,
          last_name: address.last_name,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country || 'India',
          type: address.type || 'Shipping',
          title: address.title || '',
          is_default: address.is_default,
        }
      : EMPTY
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setSubmittingState = (next: boolean) => {
    setSubmitting(next);
    onSubmittingChange?.(next);
  };

  const update =
    (key: keyof AddressPayload) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload: AddressPayload = {
      ...values,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone.trim(),
      street: values.street.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      postal_code: values.postal_code.trim(),
      title: values.title?.trim() || undefined,
    };

    setSubmittingState(true);
    try {
      const saved = address
        ? await addressService.update(address.address_id, payload)
        : await addressService.create(payload);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setErrors(error.fieldErrors);
      } else {
        setFormError('Could not save the address. Please try again.');
      }
    } finally {
      setSubmittingState(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="First name" required error={errors.first_name} htmlFor={`${formId}-first`}>
          <Input
            id={`${formId}-first`}
            autoComplete="given-name"
            value={values.first_name}
            onChange={update('first_name')}
            invalid={!!errors.first_name}
          />
        </Field>
        <Field label="Last name" required error={errors.last_name} htmlFor={`${formId}-last`}>
          <Input
            id={`${formId}-last`}
            autoComplete="family-name"
            value={values.last_name}
            onChange={update('last_name')}
            invalid={!!errors.last_name}
          />
        </Field>
      </div>

      <Field label="Phone" required error={errors.phone} htmlFor={`${formId}-phone`}>
        <Input
          id={`${formId}-phone`}
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={update('phone')}
          invalid={!!errors.phone}
          placeholder="+91 98765 43210"
        />
      </Field>

      <Field label="Street address" required error={errors.street} htmlFor={`${formId}-street`}>
        <Input
          id={`${formId}-street`}
          autoComplete="street-address"
          value={values.street}
          onChange={update('street')}
          invalid={!!errors.street}
          placeholder="Flat, building, street"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="City" required error={errors.city} htmlFor={`${formId}-city`}>
          <Input
            id={`${formId}-city`}
            autoComplete="address-level2"
            value={values.city}
            onChange={update('city')}
            invalid={!!errors.city}
          />
        </Field>
        <Field label="State" required error={errors.state} htmlFor={`${formId}-state`}>
          <Input
            id={`${formId}-state`}
            autoComplete="address-level1"
            value={values.state}
            onChange={update('state')}
            invalid={!!errors.state}
          />
        </Field>
        <Field label="Postal code" required error={errors.postal_code} htmlFor={`${formId}-zip`}>
          <Input
            id={`${formId}-zip`}
            autoComplete="postal-code"
            inputMode="numeric"
            value={values.postal_code}
            onChange={update('postal_code')}
            invalid={!!errors.postal_code}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Country" htmlFor={`${formId}-country`}>
          <Input
            id={`${formId}-country`}
            autoComplete="country-name"
            value={values.country}
            onChange={update('country')}
          />
        </Field>
        <Field label="Type" htmlFor={`${formId}-type`}>
          <Select id={`${formId}-type`} value={values.type} onChange={update('type')}>
            <option value="Shipping">Shipping</option>
            <option value="Billing">Billing</option>
          </Select>
        </Field>
        <Field label="Label" hint="e.g. Home, Office" htmlFor={`${formId}-title`}>
          <Input
            id={`${formId}-title`}
            value={values.title}
            onChange={update('title')}
            placeholder="Home"
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
        <input
          type="checkbox"
          checked={!!values.is_default}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, is_default: event.target.checked }))
          }
          className="h-4 w-4 accent-primary"
        />
        Set as my default address
      </label>

      {!hideActions && (
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="py-2.5">
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="py-2.5">
            {address ? 'Save changes' : 'Add address'}
          </Button>
        </div>
      )}
    </form>
  );
};
