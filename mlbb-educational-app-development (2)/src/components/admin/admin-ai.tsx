'use client';

import { useT } from '@/i18n/client';
import {
  Check,
  Copy,
  FileText,
  Languages,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { EmptyState, useApi } from '../ui';

/**
 * Owner-only AI panel. Produces a draft (format or Persian translation) that the owner can
 * copy or push into the active editor field. It never writes to the database.
 */
export function AdminAi({
  authorized,
  initialNotes = '',
  onUseDraft,
  notify,
}: {
  authorized: boolean;
  initialNotes?: string;
  onUseDraft?: (draft: string) => void;
  notify: (message: string) => void;
}) {
  const t = useT('admin');
  const tc = useT('common');
  const api = useApi();
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generate = async (mode: 'format' | 'translate-fa') => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/admin/ai', { text: notes, mode });
      setDraft(data.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      notify(t('draftCopied'));
    } catch {
      setError(t('clipboard'));
    }
  };
  return (
    <>
      <div className="tool-intro">
        <span className="tool-intro-icon">
          <WandSparkles size={25} />
        </span>
        <div>
          <h2>{t('aiTitle')}</h2>
          <p>{t('aiSubtitle')}</p>
        </div>
        <span className="subtle-badge">{t('ownerOnly')}</span>
      </div>
      <div className="ai-layout">
        <section className="panel">
          <h3>{t('startNotes')}</h3>
          <p>{t('notesText')}</p>
          <textarea
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            minLength={10}
            maxLength={12000}
          />
          <div className="ai-draft-actions">
            <button
              className="button primary"
              disabled={!authorized || busy || notes.trim().length < 10}
              onClick={() => generate('format')}
            >
              {busy ? <LoaderCircle size={16} /> : <Sparkles size={16} />}{' '}
              {busy ? t('formatting') : t('formatAi')}
            </button>
            <button
              className="button secondary"
              disabled={!authorized || busy || notes.trim().length < 10}
              onClick={() => generate('translate-fa')}
            >
              <Languages size={16} /> {t('translateAi')}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="info-callout">
            <ShieldCheck size={20} />
            <p>
              <strong>{t('aiSuggests')}</strong>
              {t('aiSuggestsText')}
            </p>
          </div>
        </section>
        <section className="panel ai-draft">
          <h3>{t('draftTitle')}</h3>
          {draft ? (
            <>
              <div className="markdown-content">
                <Markdown>{draft}</Markdown>
              </div>
              <div className="ai-draft-actions">
                <button className="button secondary compact" onClick={copy}>
                  <Copy size={14} />
                  {t('copyDraft')}
                </button>
                {onUseDraft && (
                  <button className="button primary compact" onClick={() => onUseDraft(draft)}>
                    <Check size={14} />
                    {t('useInEditor')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <EmptyState icon={FileText} title={t('draftRoom')} description={t('draftRoomText')} />
          )}
        </section>
      </div>
    </>
  );
}
