import { useCallback, useEffect, useSyncExternalStore } from 'react';

const DISMISS_KEY = 'ergosense-pwa-install-dismissed';

type Platform = 'ios' | 'android' | 'desktop';

type PwaStore = {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  dismissed: boolean;
  guideOpen: boolean;
};

let store: PwaStore = {
  deferred: null,
  installed: false,
  dismissed: false,
  guideOpen: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setStore(patch: Partial<PwaStore>) {
  store = { ...store, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq =
    typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const ios = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(mq) || ios;
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

let listenersAttached = false;

function ensureGlobalListeners() {
  if (typeof window === 'undefined' || listenersAttached) return;
  listenersAttached = true;

  store = {
    ...store,
    installed: isStandalone(),
    dismissed: readDismissed(),
  };

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    setStore({ deferred: e as BeforeInstallPromptEvent });
  });

  window.addEventListener('appinstalled', () => {
    setStore({ deferred: null, installed: true, guideOpen: false });
  });

  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
  mq?.addEventListener?.('change', () => setStore({ installed: isStandalone() }));
}

export function usePwaInstall() {
  ensureGlobalListeners();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const platform = detectPlatform();

  const canNativeInstall = Boolean(snap.deferred) && !snap.installed;
  // Banner só com instalação nativa — evita ícone/explicação inútil no celular (iOS etc.)
  const showBanner = canNativeInstall && !snap.dismissed;

  const install = useCallback(async () => {
    const deferred = store.deferred;
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setStore({ deferred: null });
    if (choice.outcome === 'accepted') {
      setStore({ installed: true, guideOpen: false });
      return true;
    }
    return false;
  }, []);

  const dismiss = useCallback(() => {
    setStore({ dismissed: true, guideOpen: false });
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const openGuide = useCallback(() => setStore({ guideOpen: true }), []);
  const closeGuide = useCallback(() => setStore({ guideOpen: false }), []);

  /** Tenta instalar nativo; se não der, abre o guia PC/celular. */
  const downloadApp = useCallback(async () => {
    if (store.deferred && !store.installed) {
      const ok = await install();
      if (ok) return 'installed' as const;
    }
    setStore({ guideOpen: true });
    return 'guide' as const;
  }, [install]);

  useEffect(() => {
    ensureGlobalListeners();
  }, []);

  return {
    platform,
    canInstall: canNativeInstall,
    showBanner,
    installed: snap.installed,
    guideOpen: snap.guideOpen,
    install,
    dismiss,
    openGuide,
    closeGuide,
    downloadApp,
  };
}
