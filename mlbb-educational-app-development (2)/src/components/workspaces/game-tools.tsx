'use client';

import { useFormat, useT } from '@/i18n/client';
import { useStoredState } from '@/lib/client-stores';
import {
  Crown,
  Droplets,
  Flame,
  Gem,
  Info,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Turtle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { RoleIcon, SectionHeading } from '../ui';

type TimerRecord = { target: number | null; remaining: number; duration: number };

function ObjectiveTimer({
  id,
  name,
  seconds,
  icon: Icon,
  color,
  notify,
}: {
  id: string;
  name: string;
  seconds: number;
  icon: LucideIcon;
  color: string;
  notify: (message: string) => void;
}) {
  const t = useT('tools');
  const tc = useT('common');
  const { clock } = useFormat();
  const [record, setRecord, clearRecord] = useStoredState<TimerRecord>(`nexus-timer-${id}`, {
    target: null,
    remaining: seconds,
    duration: seconds,
  });
  const [now, setNow] = useState(() => Date.now());
  const duration = record.duration || seconds;
  const target = record.target !== null && record.target > now ? record.target : null;
  const remaining =
    record.target !== null
      ? Math.max(0, Math.ceil((record.target - now) / 1000))
      : Math.min(record.remaining, duration);
  const ready = remaining === 0;
  useEffect(() => {
    if (record.target === null) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (record.target !== null && record.target <= current) {
        setRecord({ target: null, remaining: 0, duration });
        notify(t('complete', { name }));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [record.target, duration, name, notify, setRecord, t]);
  const start = () => {
    const secs = remaining > 0 ? remaining : duration;
    const current = Date.now();
    setNow(current);
    setRecord({ target: current + secs * 1000, remaining: secs, duration });
  };
  const pause = () => setRecord({ target: null, remaining, duration });
  return (
    <div
      className={`objective-timer panel ${ready ? 'timer-ready' : ''}`}
      style={{ '--timer-color': color } as CSSProperties}
    >
      <div className="timer-name">
        <span>
          <Icon size={20} />
        </span>
        <h3>{name}</h3>
        <i className={target ? 'running' : ''} />
      </div>
      <div className="timer-dial">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="68" fill="none" stroke="#2a2730" strokeWidth="4" />
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="var(--timer-color)"
            strokeWidth="4"
            strokeDasharray="427.26"
            strokeDashoffset={427.26 * (1 - remaining / duration)}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div>
          <strong dir="ltr">{clock(remaining)}</strong>
          <small>{ready ? t('ready') : target ? t('counting') : t('idle')}</small>
        </div>
      </div>
      <div className="timer-buttons">
        <button className="button secondary" onClick={target ? pause : start}>
          {target ? <Pause size={16} /> : <Play size={16} className="icon-dir" />}{' '}
          {target ? t('pause') : remaining < duration && remaining > 0 ? t('resume') : t('start')}
        </button>
        <button
          className="icon-button"
          onClick={() => clearRecord()}
          aria-label={t('resetTimer', { name })}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <label className="timer-duration">
        {t('duration')}
        <input
          type="number"
          min={10}
          max={1200}
          value={duration}
          disabled={!!target}
          aria-label={t('durationLabel', { name })}
          onChange={(e) => {
            const value = Math.max(10, Math.min(1200, Number(e.target.value) || 10));
            setRecord({ target: null, remaining: value, duration: value });
          }}
        />
        {tc('seconds')}
      </label>
    </div>
  );
}

const EMBLEM_STATS: Record<string, Record<string, number>> = {
  Assassin: { physical_attack: 10, movement_speed: 7 },
  Mage: { magic_power: 30, mana: 250 },
  Tank: { hp: 500, physical_defense: 10, magic_defense: 10 },
  Support: { hp: 250, movement_speed: 10 },
};

export function GameTools({ notify }: { notify: (message: string) => void }) {
  const t = useT('tools');
  const th = useT('hero.statsLabels');
  const { n, term } = useFormat();
  const [tool, setTool] = useState<'timers' | 'emblems'>('timers');
  const [emblem, setEmblem] = useState('Assassin');
  const [level, setLevel] = useState(60);
  const [talent, setTalent] = useState('Thrill');
  const bonus =
    talent === 'Thrill'
      ? { physical_attack: 16 }
      : talent === 'Vitality'
        ? { hp: 225 }
        : { physical_defense: 6, magic_defense: 6 };
  const totals: Record<string, number> = { ...EMBLEM_STATS[emblem] };
  for (const [k, v] of Object.entries(bonus)) totals[k] = (totals[k] || 0) + (v * 60) / level;
  return (
    <div>
      <div className="tool-intro">
        <span className="tool-intro-icon">
          <Timer size={25} />
        </span>
        <div>
          <h2>{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </div>
        <div className="segmented-control">
          <button onClick={() => setTool('timers')} className={tool === 'timers' ? 'active' : ''}>
            <Timer size={15} /> {t('timers')}
          </button>
          <button onClick={() => setTool('emblems')} className={tool === 'emblems' ? 'active' : ''}>
            <Gem size={15} /> {t('emblems')}
          </button>
        </div>
      </div>
      {tool === 'timers' ? (
        <>
          <SectionHeading
            eyebrow={t('jungleTimers')}
            title={t('stayAhead')}
            description={t('timersText')}
          />
          <div className="timer-grid">
            <ObjectiveTimer
              id="Turtle"
              name={t('turtle')}
              seconds={120}
              icon={Turtle}
              color="#72c9b0"
              notify={notify}
            />
            <ObjectiveTimer
              id="Lord"
              name={t('lord')}
              seconds={180}
              icon={Crown}
              color="#d5b074"
              notify={notify}
            />
            <ObjectiveTimer
              id="Blue buff"
              name={t('blueBuff')}
              seconds={120}
              icon={Droplets}
              color="#90a6f4"
              notify={notify}
            />
            <ObjectiveTimer
              id="Red buff"
              name={t('redBuff')}
              seconds={120}
              icon={Flame}
              color="#e9958a"
              notify={notify}
            />
          </div>
          <div className="info-callout">
            <Info size={21} />
            <p>
              <strong>{t('calloutTitle')}</strong>
              {t('calloutText')}
            </p>
          </div>
        </>
      ) : (
        <div className="emblem-layout">
          <section className="panel emblem-editor">
            <span className="eyebrow">{t('foundation')}</span>
            <h3>{t('emblemCalculator')}</h3>
            <div className="emblem-options">
              {Object.keys(EMBLEM_STATS).map((e) => (
                <button
                  className={e === emblem ? 'active' : ''}
                  key={e}
                  onClick={() => setEmblem(e)}
                >
                  <RoleIcon role={e} size={25} />
                  {term('emblems', e)}
                </button>
              ))}
            </div>
            <label className="emblem-level">
              {t('emblemLevel')}
              <strong>
                {n(level)}
                <span> / {n(60)}</span>
              </strong>
              <input
                type="range"
                min={1}
                max={60}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
              />
              <span>{n(1)}</span>
              <span>{n(60)}</span>
            </label>
            <label className="field-label">
              {t('talent')}
              <select
                className="form-input"
                value={talent}
                onChange={(e) => setTalent(e.target.value)}
              >
                {['Thrill', 'Vitality', 'Firmness'].map((v) => (
                  <option key={v} value={v}>
                    {t(`talents.${v}`)}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted-text">{t(`talent${talent}`)}</p>
          </section>
          <section className="panel emblem-summary">
            <span className="large-emblem">
              <RoleIcon role={emblem} size={55} />
            </span>
            <span className="eyebrow">
              {t('levelEmblem', { level: n(level), emblem: term('emblems', emblem) })}
            </span>
            <h3>{t('bonusStats')}</h3>
            {Object.entries(totals).map(([key, val]) => (
              <div className="emblem-stat" key={key}>
                <span>{th(key)}</span>
                <strong>+{n(Math.round((val * level) / 60))}</strong>
              </div>
            ))}
            <p className="fine-print">{t('emblemDisclaimer')}</p>
          </section>
        </div>
      )}
    </div>
  );
}
