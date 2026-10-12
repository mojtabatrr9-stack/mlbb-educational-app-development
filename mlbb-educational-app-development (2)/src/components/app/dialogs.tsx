'use client';

import { useT } from '@/i18n/client';
import { ArrowRight, Bookmark, Check, Download, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { Brand, Modal } from '../ui';
import { LanguageButton } from './topbar';

export function ProfileDialog({
  nickname,
  favoriteCount,
  installEvent,
  onInstall,
  onSave,
  onClose,
}: {
  nickname: string;
  favoriteCount: number;
  installEvent: Event | null;
  onInstall: () => void;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT('profile');
  const tn = useT('nav');
  const [value, setValue] = useState(nickname);
  return (
    <Modal title={tn('profile')} onClose={onClose}>
      <div className="simple-modal">
        <div className="modal-symbol">
          <User size={28} />
        </div>
        <span className="eyebrow">{t('eyebrow')}</span>
        <h2>{t('title')}</h2>
        <p>{t('text')}</p>
        <label className="field-label">
          {t('nickname')}
          <input
            className="form-input"
            value={value}
            maxLength={24}
            placeholder={t('defaultName')}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <button className="button primary full-width" onClick={() => onSave(value.trim())}>
          {t('save')}
          <Check size={16} />
        </button>
        <div className="profile-summary">
          <Bookmark size={17} />
          {t('savedHeroes', { count: favoriteCount })}
          <span>{t('storedLocally')}</span>
        </div>
        <LanguageButton compact />
        {installEvent && (
          <button
            className="button secondary full-width"
            onClick={async () => {
              await (installEvent as Event & { prompt: () => Promise<void> }).prompt();
              onInstall();
            }}
          >
            <Download size={17} />
            {t('install')}
          </button>
        )}
      </div>
    </Modal>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const t = useT('about');
  const th = useT('home');
  return (
    <Modal title={th('about')} onClose={onClose}>
      <div className="simple-modal">
        <Brand />
        <span className="eyebrow">{t('eyebrow')}</span>
        <h2>{t('title')}</h2>
        <p>{t('text')}</p>
        <div className="info-callout">
          <ShieldCheck size={22} />
          <p>
            <strong>{t('calloutTitle')}</strong>
            {t('calloutText')}
          </p>
        </div>
        <p className="fine-print">{t('legal')}</p>
        <button className="button primary" onClick={onClose}>
          {t('back')}
          <ArrowRight size={16} className="icon-dir" />
        </button>
      </div>
    </Modal>
  );
}
