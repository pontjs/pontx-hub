import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import type { Locale } from "~/lib/catalog/types";

let assistantModule: Promise<typeof import("./ai-assistant")> | undefined;

function loadAssistant() {
  assistantModule ??= import("./ai-assistant");
  return assistantModule;
}

const LazyAiAssistantPanel = lazy(async () => {
  const module = await loadAssistant();
  return { default: module.AiAssistantPanel };
});

const copy = {
  zh: { label: "Pontx Agent", loading: "正在打开 Pontx Agent…" },
  en: { label: "Pontx Agent", loading: "Opening Pontx Agent…" }
} satisfies Record<Locale, { label: string; loading: string }>;

function AgentIcon() {
  return (
    <svg
      className="ai-assistant-trigger-icon"
      data-agent-icon="agent-operator"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="9" r="3.2" />
      <path d="M4.8 19.25c.72-3.14 3.18-5.12 6.12-5.12s5.4 1.98 6.12 5.12" />
      <path d="m17.55 2.9.64 1.96 1.96.64-1.96.64-.64 1.96-.64-1.96-1.96-.64 1.96-.64.64-1.96Z" />
    </svg>
  );
}

export function AiAssistantLauncher({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [floatingTrigger, setFloatingTrigger] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 740px)");
    const updatePlacement = () => setFloatingTrigger(query.matches);
    updatePlacement();
    query.addEventListener("change", updatePlacement);
    return () => query.removeEventListener("change", updatePlacement);
  }, []);

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="site-control ai-assistant-trigger"
      aria-label={text.label}
      title={text.label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onPointerDown={() => void loadAssistant()}
      onClick={() => {
        setActivated(true);
        setOpen(true);
      }}
    >
      <AgentIcon />
      <span className="ai-assistant-trigger-label">{text.label}</span>
    </button>
  );

  return (
    <>
      {hydrated && floatingTrigger ? createPortal(trigger, document.body) : trigger}
      {activated ? (
        <Suspense
          fallback={open ? (
            <span className="sr-only" role="status" aria-live="polite">
              {text.loading}
            </span>
          ) : null}
        >
          <LazyAiAssistantPanel
            locale={locale}
            open={open}
            onClose={close}
            triggerRef={triggerRef}
          />
        </Suspense>
      ) : null}
    </>
  );
}
