'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Mail,
  Phone,
  Sun,
  Sunset,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from '@/components/ui/Calendar';
import { Select, type SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

type AppointmentType = 'permit_renewal' | 'consultation' | 'inspection';

type Props = {
  sessionId: string;
  lang: 'en' | 'es';
  defaultType?: AppointmentType;
  onBooked: (msg: BookedMessage) => void;
  onDismiss: () => void;
};

export type BookedMessage = {
  appointment_type: AppointmentType;
  slot_start: string;
  slot_end: string;
  confirmation_code: string;
  resident_name: string;
};

const STRINGS = {
  en: {
    title: 'Book an appointment',
    subtitle: 'Pick a service, date, and time. We confirm immediately.',
    type: 'Appointment type',
    typeOptions: {
      permit_renewal: { label: 'Permit renewal', description: 'BTR, occupational license renewal' },
      consultation: { label: 'Consultation', description: 'Talk with city staff about a project' },
      inspection: { label: 'Inspection', description: 'Schedule a site or building inspection' }
    } satisfies Record<AppointmentType, { label: string; description: string }>,
    date: 'Date',
    pickDate: 'Pick a date',
    time: 'Time',
    morning: 'Morning',
    afternoon: 'Afternoon',
    yourName: 'Your name',
    contact: 'Phone or email',
    namePlaceholder: 'Jane Doral',
    contactPlaceholder: '+1 305 555 0123 or jane@example.com',
    confirm: 'Confirm appointment',
    confirming: 'Confirming…',
    cancel: 'Cancel',
    requiredAll: 'Please fill in every field.',
    serverError: 'We couldn\'t book that appointment. Please try again.',
    successTitle: 'Appointment confirmed',
    successHint: 'Check your text messages for a reminder before the visit.',
    close: 'Close'
  },
  es: {
    title: 'Reservar una cita',
    subtitle: 'Elige un servicio, fecha y hora. Confirmamos al instante.',
    type: 'Tipo de cita',
    typeOptions: {
      permit_renewal: { label: 'Renovación de permiso', description: 'Renovación de BTR / licencia ocupacional' },
      consultation: { label: 'Consulta', description: 'Habla con personal de la ciudad sobre un proyecto' },
      inspection: { label: 'Inspección', description: 'Programa una inspección de obra o edificio' }
    } satisfies Record<AppointmentType, { label: string; description: string }>,
    date: 'Fecha',
    pickDate: 'Elige una fecha',
    time: 'Hora',
    morning: 'Mañana',
    afternoon: 'Tarde',
    yourName: 'Tu nombre',
    contact: 'Teléfono o correo',
    namePlaceholder: 'Jane Doral',
    contactPlaceholder: '+1 305 555 0123 o jane@example.com',
    confirm: 'Confirmar cita',
    confirming: 'Confirmando…',
    cancel: 'Cancelar',
    requiredAll: 'Por favor completa todos los campos.',
    serverError: 'No pudimos reservar esa cita. Inténtalo de nuevo.',
    successTitle: 'Cita confirmada',
    successHint: 'Revisa tus mensajes de texto para un recordatorio antes de la visita.',
    close: 'Cerrar'
  }
} as const;

const TYPE_ICONS: Record<AppointmentType, React.ReactNode> = {
  permit_renewal: <ClipboardCheck className="h-4 w-4 text-primary" />,
  consultation: <CalendarCheck className="h-4 w-4 text-secondary" />,
  inspection: <Wrench className="h-4 w-4 text-gold" />
};

const SLOT_DURATION_MIN = 45;
const MORNING_SLOTS = ['09:00', '10:00', '11:00'];
const AFTERNOON_SLOTS = ['13:00', '14:00', '15:00', '16:00'];

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextBusinessDayIso(): string {
  const d = new Date();
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return ymdLocal(d);
}

function detectContactKind(s: string): 'phone' | 'email' | null {
  const t = s.trim();
  if (!t) return null;
  if (/@/.test(t) && /\./.test(t.split('@')[1] ?? '')) return 'email';
  if (/[+0-9]/.test(t) && t.replace(/\D/g, '').length >= 7) return 'phone';
  return null;
}

export function AppointmentPicker({ sessionId, lang, defaultType = 'permit_renewal', onBooked, onDismiss }: Props) {
  const s = STRINGS[lang];

  const [type, setType] = useState<AppointmentType>(defaultType);
  const [date, setDate] = useState<string | null>(nextBusinessDayIso());
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [success, setSuccess] = useState<BookedMessage | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const typeOptions: SelectOption<AppointmentType>[] = useMemo(
    () =>
      (['permit_renewal', 'consultation', 'inspection'] as const).map((v) => ({
        value: v,
        label: s.typeOptions[v].label,
        description: s.typeOptions[v].description,
        icon: TYPE_ICONS[v]
      })),
    [s]
  );

  // Close date popover on outside click
  useEffect(() => {
    if (!datePopoverOpen) return;
    function onPointer(e: MouseEvent) {
      if (!dateRef.current?.contains(e.target as Node)) setDatePopoverOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [datePopoverOpen]);

  // When the picker first appears inside a scroll container (the chat log),
  // scroll it into view so the whole form is reachable without manual scroll.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // When the date popover opens, scroll the date row to near the top of the
  // chat log so the 320px calendar popover below it isn't clipped.
  useEffect(() => {
    if (!datePopoverOpen) return;
    dateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [datePopoverOpen]);

  const formattedDate = useMemo(() => {
    if (!date) return null;
    return new Date(date + 'T00:00:00').toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }, [date, lang]);

  const contactKind = detectContactKind(contact);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date || !time || !name.trim() || !contact.trim()) {
      setError(s.requiredAll);
      return;
    }
    setPending(true);
    const [h, m] = time.split(':').map(Number);
    const start = new Date(`${date}T00:00:00`);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + SLOT_DURATION_MIN);

    try {
      const resp = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversation_session_id: sessionId,
          appointment_type: type,
          slot_start: start.toISOString(),
          slot_end: end.toISOString(),
          resident_name: name.trim(),
          resident_contact: contact.trim()
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.confirmation_code) {
        setError(s.serverError);
        return;
      }
      const booked: BookedMessage = {
        appointment_type: type,
        slot_start: start.toISOString(),
        slot_end: end.toISOString(),
        confirmation_code: data.confirmation_code,
        resident_name: name.trim()
      };
      setSuccess(booked);
    } catch {
      setError(s.serverError);
    } finally {
      setPending(false);
    }
  }

  // Show the success card for ~1.4s, then hand off to the parent which will
  // post the confirmation message into the chat log.
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => onBooked(success), 1400);
    return () => clearTimeout(t);
  }, [success, onBooked]);

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative self-start w-full max-w-[520px] rounded-2xl border border-border bg-surface-2/70 p-4 shadow-soft"
    >
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* Heading */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                aria-label={s.cancel}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Type dropdown */}
            <Field label={s.type}>
              <div className="relative z-40">
                <Select<AppointmentType>
                  ariaLabel={s.type}
                  value={type}
                  onChange={setType}
                  options={typeOptions}
                />
              </div>
            </Field>

            {/* Date — button that opens a Calendar popover */}
            <Field label={s.date}>
              <div ref={dateRef} className="relative z-30">
                <button
                  type="button"
                  onClick={() => setDatePopoverOpen((p) => !p)}
                  aria-haspopup="dialog"
                  aria-expanded={datePopoverOpen}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    datePopoverOpen && 'border-primary shadow-soft'
                  )}
                >
                  <span className={cn('truncate', !formattedDate && 'text-muted-foreground')}>
                    {formattedDate ?? s.pickDate}
                  </span>
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {datePopoverOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      role="dialog"
                      aria-label={s.pickDate}
                      className="absolute left-0 top-full z-40 mt-1.5"
                    >
                      <Calendar
                        value={date}
                        onChange={(iso) => {
                          setDate(iso);
                          setDatePopoverOpen(false);
                        }}
                        weekendsDisabled
                        locale={lang === 'es' ? 'es-ES' : 'en-US'}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Field>

            {/* Time chips */}
            <Field label={s.time}>
              <div className="space-y-2">
                <SlotGroup
                  icon={<Sun className="h-3 w-3" />}
                  label={s.morning}
                  slots={MORNING_SLOTS}
                  active={time}
                  onPick={setTime}
                />
                <SlotGroup
                  icon={<Sunset className="h-3 w-3" />}
                  label={s.afternoon}
                  slots={AFTERNOON_SLOTS}
                  active={time}
                  onPick={setTime}
                />
              </div>
            </Field>

            {/* Name */}
            <Field label={s.yourName} htmlFor="appt-name">
              <input
                id="appt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={s.namePlaceholder}
                className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                autoComplete="name"
                required
              />
            </Field>

            {/* Contact with icon hint */}
            <Field label={s.contact} htmlFor="appt-contact">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 transition focus-within:border-primary focus-within:shadow-soft',
                  contactKind && 'border-primary/30'
                )}
              >
                <span className="text-muted-foreground" aria-hidden="true">
                  {contactKind === 'email' ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : contactKind === 'phone' ? (
                    <Phone className="h-4 w-4 text-primary" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </span>
                <input
                  id="appt-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={s.contactPlaceholder}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoComplete="tel"
                  required
                />
              </div>
            </Field>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {s.cancel}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                {pending ? s.confirming : s.confirm}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center gap-3 py-6 text-center"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 18 }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success"
            >
              <CheckCircle2 className="h-7 w-7" />
            </motion.span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{s.successTitle}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.successHint}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Code <span className="font-mono font-semibold">{success.confirmation_code}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SlotGroup({
  icon,
  label,
  slots,
  active,
  onPick
}: {
  icon: React.ReactNode;
  label: string;
  slots: readonly string[];
  active: string | null;
  onPick: (s: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span aria-hidden="true">{icon}</span>
        {label}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((t) => {
          const isActive = active === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className={cn(
                'rounded-lg border px-1 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'border-primary bg-primary/10 text-primary shadow-soft'
                  : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
