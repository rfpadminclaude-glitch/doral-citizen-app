'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  Copy,
  Crosshair,
  FileText,
  FileWarning,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  TreePine,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Select, type SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

export type RequestType =
  | 'permit'
  | 'code_violation'
  | 'park_issue'
  | 'general'
  | 'pothole'
  | 'inspection'
  | 'complaint';

type Props = {
  sessionId: string;
  lang: 'en' | 'es';
  /** Pre-selected request_type when the form is launched from a quick-action card. */
  initialType?: RequestType;
  onSubmitted: (msg: SubmittedMessage) => void;
  onDismiss: () => void;
};

export type SubmittedMessage = {
  case_code: string;
  request_type: RequestType;
  title: string;
  resident_name: string;
};

const STRINGS = {
  en: {
    title: 'Open a service request',
    subtitle: 'Tell us what\'s going on. We\'ll create a tracked case.',
    type: 'Category',
    typeOptions: {
      permit: { label: 'Permits / business tax', description: 'Issues with a permit or BTR' },
      code_violation: { label: 'Code violation', description: 'Tall grass, illegal dumping, signs in right-of-way' },
      park_issue: { label: 'Parks / facilities', description: 'Damage, vandalism, missing equipment' },
      general: { label: 'General', description: 'Anything else' },
      pothole: { label: 'Pothole / road surface', description: 'Pothole, sinkhole, damaged pavement' },
      inspection: { label: 'Inspection request', description: 'Schedule a property or construction inspection' },
      complaint: { label: 'Complaint', description: 'A concern that isn\'t a code violation' }
    } satisfies Record<RequestType, { label: string; description: string }>,
    titleField: 'Title',
    titlePlaceholder: 'Pothole on NW 50th',
    description: 'Description',
    descriptionPlaceholder: 'A few sentences with the location and what you saw.',
    addressField: 'Address',
    addressPlaceholder: '8401 NW 53rd Ter, Doral, FL',
    useMyLocation: 'Use my location',
    pinCaptured: 'Pin captured',
    locationDenied: 'Location permission denied',
    yourName: 'Your name',
    namePlaceholder: 'Jane Doral',
    contact: 'Phone or email',
    contactPlaceholder: '+1 305 555 0123 or jane@example.com',
    submit: 'Submit request',
    submitting: 'Submitting…',
    cancel: 'Cancel',
    required: 'Please fill in every field.',
    descTooShort: 'Description must be at least 10 characters.',
    serverError: 'We couldn\'t submit that. Please try again.',
    successTitle: 'Request submitted',
    successHint: 'A staff member will follow up via your phone or email. Track this case with the code below.',
    close: 'Close',
    caseLabel: 'Case number',
    saveCode: 'Save this code',
    copyCode: 'Copy code',
    copied: 'Copied!'
  },
  es: {
    title: 'Abrir una solicitud',
    subtitle: 'Cuéntanos qué pasa. Crearemos un caso rastreable.',
    type: 'Categoría',
    typeOptions: {
      permit: { label: 'Permisos / impuesto de negocio', description: 'Problemas con un permiso o BTR' },
      code_violation: { label: 'Infracción del código', description: 'Pasto alto, vertido ilegal, letreros en la vía' },
      park_issue: { label: 'Parques / instalaciones', description: 'Daños, vandalismo, equipo faltante' },
      general: { label: 'General', description: 'Cualquier otra cosa' },
      pothole: { label: 'Bache / superficie de calle', description: 'Bache, hundimiento, pavimento dañado' },
      inspection: { label: 'Solicitud de inspección', description: 'Programar una inspección de propiedad o construcción' },
      complaint: { label: 'Queja', description: 'Una inquietud que no es una infracción del código' }
    } satisfies Record<RequestType, { label: string; description: string }>,
    titleField: 'Título',
    titlePlaceholder: 'Bache en NW 50th',
    description: 'Descripción',
    descriptionPlaceholder: 'Un par de oraciones con la ubicación y lo que viste.',
    addressField: 'Dirección',
    addressPlaceholder: '8401 NW 53rd Ter, Doral, FL',
    useMyLocation: 'Usar mi ubicación',
    pinCaptured: 'Ubicación capturada',
    locationDenied: 'Permiso de ubicación denegado',
    yourName: 'Tu nombre',
    namePlaceholder: 'Jane Doral',
    contact: 'Teléfono o correo',
    contactPlaceholder: '+1 305 555 0123 o jane@example.com',
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',
    cancel: 'Cancelar',
    required: 'Por favor completa todos los campos.',
    descTooShort: 'La descripción debe tener al menos 10 caracteres.',
    serverError: 'No pudimos enviar la solicitud. Inténtalo de nuevo.',
    successTitle: 'Solicitud enviada',
    successHint: 'Un miembro del personal te contactará por teléfono o correo. Rastrea este caso con el código.',
    close: 'Cerrar',
    caseLabel: 'Número de caso',
    saveCode: 'Guarda este código',
    copyCode: 'Copiar código',
    copied: '¡Copiado!'
  }
} as const;

const TYPE_ICONS: Record<RequestType, React.ReactNode> = {
  permit: <FileText className="h-4 w-4 text-primary" />,
  code_violation: <FileWarning className="h-4 w-4 text-accent" />,
  park_issue: <TreePine className="h-4 w-4 text-secondary" />,
  general: <MapPin className="h-4 w-4 text-gold" />,
  pothole: <Construction className="h-4 w-4 text-accent" />,
  inspection: <ClipboardCheck className="h-4 w-4 text-secondary" />,
  complaint: <Megaphone className="h-4 w-4 text-destructive" />
};

function detectContactKind(s: string): 'phone' | 'email' | null {
  const t = s.trim();
  if (!t) return null;
  if (/@/.test(t) && /\./.test(t.split('@')[1] ?? '')) return 'email';
  if (/[+0-9]/.test(t) && t.replace(/\D/g, '').length >= 7) return 'phone';
  return null;
}

export function ServiceRequestForm({ sessionId, lang, initialType, onSubmitted, onDismiss }: Props) {
  const s = STRINGS[lang];

  const [type, setType] = useState<RequestType>(initialType ?? 'general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<SubmittedMessage | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function captureLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(s.locationDenied);
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setClientCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError(s.locationDenied);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }

  // Scroll into view on mount so the whole form is reachable.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Surface the success state for a beat, then hand off to chat. The hand-off
  // is paused if the resident actively engages with the code (copies it) so
  // they have time to save it before the card disappears.
  useEffect(() => {
    if (!success) return;
    const ms = codeCopied ? 3200 : 1800;
    const id = setTimeout(() => onSubmitted(success), ms);
    return () => clearTimeout(id);
  }, [success, onSubmitted, codeCopied]);

  async function copyCaseCode() {
    if (!success) return;
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(success.case_code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = success.case_code;
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      /* ignore — clipboard blocked */
    }
  }

  const typeOptions: SelectOption<RequestType>[] = (
    [
      'permit',
      'code_violation',
      'park_issue',
      'pothole',
      'inspection',
      'complaint',
      'general'
    ] as const
  ).map((v) => ({
    value: v,
    label: s.typeOptions[v].label,
    description: s.typeOptions[v].description,
    icon: TYPE_ICONS[v]
  }));

  const contactKind = detectContactKind(contact);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !title.trim() ||
      !description.trim() ||
      !address.trim() ||
      !name.trim() ||
      !contact.trim()
    ) {
      setError(s.required);
      return;
    }
    if (description.trim().length < 10) {
      setError(s.descTooShort);
      return;
    }
    setPending(true);
    try {
      const resp = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversation_session_id: sessionId,
          request_type: type,
          title: title.trim(),
          description: description.trim(),
          resident_name: name.trim(),
          resident_contact: contact.trim(),
          address_line: address.trim(),
          client_lat: clientCoords?.lat,
          client_lng: clientCoords?.lng
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.case_code) {
        setError(s.serverError);
        return;
      }
      setSuccess({
        case_code: data.case_code,
        request_type: type,
        title: title.trim(),
        resident_name: name.trim()
      });
    } catch {
      setError(s.serverError);
    } finally {
      setPending(false);
    }
  }

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
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <FileWarning className="h-4 w-4" />
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

            {/* Type */}
            <Field label={s.type}>
              <div className="relative z-40">
                <Select<RequestType>
                  ariaLabel={s.type}
                  value={type}
                  onChange={setType}
                  options={typeOptions}
                />
              </div>
            </Field>

            {/* Title */}
            <Field label={s.titleField} htmlFor="sr-title">
              <input
                id="sr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={s.titlePlaceholder}
                className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                required
                maxLength={160}
              />
            </Field>

            {/* Description */}
            <Field label={s.description} htmlFor="sr-description">
              <textarea
                id="sr-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={s.descriptionPlaceholder}
                rows={3}
                className="block w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                required
                minLength={10}
                maxLength={2000}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {description.length}/2000
              </p>
            </Field>

            {/* Address */}
            <Field label={s.addressField} htmlFor="sr-address">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 transition focus-within:border-primary focus-within:shadow-soft">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="sr-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={s.addressPlaceholder}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    autoComplete="street-address"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {locating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="h-3.5 w-3.5" />
                    )}
                    {s.useMyLocation}
                  </button>
                  {clientCoords && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                      <Check className="h-3 w-3" />
                      {s.pinCaptured}
                    </span>
                  )}
                  {locationError && (
                    <span className="text-[10px] text-muted-foreground">{locationError}</span>
                  )}
                </div>
              </div>
            </Field>

            {/* Name */}
            <Field label={s.yourName} htmlFor="sr-name">
              <input
                id="sr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={s.namePlaceholder}
                className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                autoComplete="name"
                required
              />
            </Field>

            {/* Contact */}
            <Field label={s.contact} htmlFor="sr-contact">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 transition focus-within:border-primary focus-within:shadow-soft',
                  contactKind && 'border-primary/30'
                )}
              >
                <span aria-hidden="true">
                  {contactKind === 'email' ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : contactKind === 'phone' ? (
                    <Phone className="h-4 w-4 text-primary" />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <input
                  id="sr-contact"
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
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileWarning className="h-3.5 w-3.5" />}
                {pending ? s.submitting : s.submit}
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
            <div className="w-full">
              <h3 className="text-sm font-semibold text-foreground">{s.successTitle}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.successHint}</p>
              <div className="mx-auto mt-3 flex max-w-[320px] flex-col items-center gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 px-4 py-3 shadow-soft">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {s.caseLabel}
                </span>
                <span className="font-mono text-lg font-bold tracking-wider text-primary">
                  {success.case_code}
                </span>
                <button
                  type="button"
                  onClick={copyCaseCode}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={s.copyCode}
                >
                  {codeCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {s.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      {s.saveCode}
                    </>
                  )}
                </button>
              </div>
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
