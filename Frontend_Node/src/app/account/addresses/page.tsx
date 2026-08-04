'use client';

import React, { useState } from 'react';
import { addressService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { AddressForm } from '@/components/account/AddressForm';
import { Badge, Button, Modal } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton } from '@/components/ui/Feedback';
import type { Address } from '@/types/api';

export default function AddressesPage() {
  const toast = useToast();
  const addresses = useApiResource((signal) => addressService.list(signal), []);

  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const items = addresses.data ?? [];
  const atLimit = items.length >= 10; // MAX_ADDRESSES in the backend constants.

  const makeDefault = async (address: Address) => {
    setPendingId(address.address_id);
    try {
      await addressService.setDefault(address.address_id);
      toast.success('Default address updated.');
      addresses.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not set the default address.');
    } finally {
      setPendingId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setPendingId(confirmDelete.address_id);
    try {
      await addressService.remove(confirmDelete.address_id);
      toast.success('Address deleted.');
      setConfirmDelete(null);
      addresses.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete the address.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            Delivery
          </span>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Addresses
          </h1>
          <p className="text-sm text-on-surface-variant">
            {items.length} of 10 saved
          </p>
        </div>

        <Button
          icon="add"
          onClick={() => setCreating(true)}
          disabled={atLimit}
          className="py-2.5"
        >
          Add address
        </Button>
      </header>

      {atLimit && (
        <p className="rounded-md border-l-4 border-outline bg-surface-container px-4 py-3 text-sm text-on-surface">
          You have reached the maximum of 10 saved addresses. Delete one to add another.
        </p>
      )}

      {addresses.loading && <ListRowSkeleton count={3} />}

      {!addresses.loading && addresses.error && (
        <ErrorState message={addresses.error} onRetry={addresses.reload} />
      )}

      {!addresses.loading && !addresses.error && items.length === 0 && (
        <EmptyState
          icon="home_pin"
          title="No saved addresses"
          description="Save an address to speed up checkout."
          actionLabel="Add your first address"
          onAction={() => setCreating(true)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((address) => (
          <article
            key={address.address_id}
            className={cn(
              'flex flex-col justify-between gap-4 rounded-xl border-2 bg-surface-container-lowest p-5',
              address.is_default ? 'border-primary' : 'border-outline-variant/30'
            )}
          >
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-headline text-base font-bold text-primary">
                  {address.first_name} {address.last_name}
                </span>
                {address.is_default && <Badge tone="accent">Default</Badge>}
                <Badge>{address.type}</Badge>
                {address.title && (
                  <span className="text-[10px] uppercase tracking-wider text-outline">
                    {address.title}
                  </span>
                )}
              </div>
              <address className="text-sm not-italic leading-relaxed text-on-surface-variant">
                {address.street}
                <br />
                {address.city}, {address.state} {address.postal_code}
                <br />
                {address.country}
              </address>
              <p className="mt-2 text-xs text-outline">{address.phone}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-outline-variant/20 pt-3">
              <button
                onClick={() => setEditing(address)}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outline transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit
              </button>
              {!address.is_default && (
                <button
                  onClick={() => makeDefault(address)}
                  disabled={pendingId === address.address_id}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outline transition-colors hover:text-primary disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-base">star</span>
                  Set default
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(address)}
                disabled={pendingId === address.address_id}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outline transition-colors hover:text-error disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Create / edit */}
      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit address' : 'Add a new address'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="py-2.5"
            >
              Cancel
            </Button>
            <Button type="submit" form="account-address-form" loading={saving} className="py-2.5">
              {editing ? 'Save changes' : 'Add address'}
            </Button>
          </div>
        }
      >
        <AddressForm
          // Remount between create and edit so the form reseeds its state.
          key={editing?.address_id ?? 'new'}
          formId="account-address-form"
          hideActions
          address={editing}
          onSubmittingChange={setSaving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            toast.success(editing ? 'Address updated.' : 'Address added.');
            setCreating(false);
            setEditing(null);
            addresses.reload();
          }}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this address?"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="py-2.5">
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={remove}
              loading={pendingId === confirmDelete?.address_id}
              className="py-2.5"
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant">
          {confirmDelete && (
            <>
              <strong className="text-primary">
                {confirmDelete.first_name} {confirmDelete.last_name}
              </strong>
              , {confirmDelete.street}, {confirmDelete.city} will be removed. Past orders keep their
              recorded delivery address.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
