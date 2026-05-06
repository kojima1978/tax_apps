import React, { useCallback, useMemo } from 'react';
import Plus from 'lucide-react/icons/plus';
import Gift from 'lucide-react/icons/gift';
import Users from 'lucide-react/icons/users';
import { SectionHeader } from '../SectionHeader';
import type { GiftRecipient } from '../../types';
import { generateId } from '../../utils';
import { useUniqueOptions } from '../../hooks/useUniqueOptions';
import { CARD } from '../tableStyles';
import { CashGiftRecipientCard, type RecipientOption } from './CashGiftRecipientCard';

interface CashGiftRecipientListProps {
  recipients: GiftRecipient[];
  recipientOptions: RecipientOption[];
  onChange: (recipients: GiftRecipient[]) => void;
}

const getHeirId = (recipient: GiftRecipient) => recipient.heirId;

function resolveRecipientUpdates(
  updates: Partial<GiftRecipient>,
  optionById: Map<string, RecipientOption>,
): Partial<GiftRecipient> {
  if (!updates.heirId) return updates;

  const selectedHeir = optionById.get(updates.heirId);
  return selectedHeir
    ? { ...updates, heirLabel: selectedHeir.label }
    : updates;
}

export const CashGiftRecipientList: React.FC<CashGiftRecipientListProps> = ({
  recipients,
  recipientOptions,
  onChange,
}) => {
  const heirRecipients = useMemo(
    () => recipients.filter(r => r.isHeir),
    [recipients],
  );
  const recipientOptionById = useMemo(
    () => new Map(recipientOptions.map(option => [option.id, option])),
    [recipientOptions],
  );
  const { nextAvailable, canAdd, getAvailableFor } = useUniqueOptions(heirRecipients, recipientOptions, getHeirId);

  const addHeirRecipient = useCallback(() => {
    if (!nextAvailable) return;
    onChange([
      ...recipients,
      {
        id: generateId(),
        heirId: nextAvailable.id,
        heirLabel: nextAvailable.label,
        annualAmount: 0,
        years: 0,
        isHeir: true,
        taxType: 'special',
      },
    ]);
  }, [nextAvailable, onChange, recipients]);

  const addExternalRecipient = useCallback(() => {
    const source = recipientOptions[0];
    if (!source) return;
    const newId = generateId();
    onChange([
      ...recipients,
      {
        id: newId,
        heirId: newId,
        heirLabel: '',
        annualAmount: 0,
        years: 0,
        isHeir: false,
        taxType: 'general',
        sourceHeirId: source.id,
        sourceHeirLabel: source.label,
      },
    ]);
  }, [onChange, recipientOptions, recipients]);

  const removeRecipient = useCallback((id: string) => {
    onChange(recipients.filter(r => r.id !== id));
  }, [onChange, recipients]);

  const updateRecipient = useCallback((id: string, updates: Partial<GiftRecipient>) => {
    const resolvedUpdates = resolveRecipientUpdates(updates, recipientOptionById);
    onChange(recipients.map(r => r.id === id ? { ...r, ...resolvedUpdates } : r));
  }, [onChange, recipientOptionById, recipients]);

  const selectSourceHeir = useCallback((id: string, sourceId: string) => {
    const source = recipientOptionById.get(sourceId);
    updateRecipient(id, {
      sourceHeirId: source?.id ?? undefined,
      sourceHeirLabel: source?.label ?? undefined,
    });
  }, [recipientOptionById, updateRecipient]);

  return (
    <div className={CARD}>
      <SectionHeader icon={Gift} title="贈与受取人" />

      {recipients.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">受取人なし</p>
      ) : (
        <div className="space-y-4">
          {recipients.map((recipient, index) => {
            const availableOptions = recipient.isHeir ? getAvailableFor(recipient.id) : [];
            const selectedSource = recipient.sourceHeirId ? recipientOptionById.get(recipient.sourceHeirId) : undefined;
            const selectedSourceId = selectedSource?.id ?? recipientOptions[0]?.id ?? '';

            return (
              <CashGiftRecipientCard
                key={recipient.id}
                recipient={recipient}
                index={index}
                availableOptions={availableOptions}
                recipientOptions={recipientOptions}
                selectedSourceId={selectedSourceId}
                onRemove={removeRecipient}
                onSelectSource={selectSourceHeir}
                onUpdate={updateRecipient}
              />
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={addHeirRecipient}
          disabled={!canAdd}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          相続人を追加
        </button>
        <button
          type="button"
          onClick={addExternalRecipient}
          disabled={recipientOptions.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Users className="w-4 h-4" />
          関係者を追加
        </button>
      </div>
    </div>
  );
};
