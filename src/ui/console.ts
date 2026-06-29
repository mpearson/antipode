/**
 * Mirror console output into an on-screen panel — the phone-friendly debugger,
 * since there's no devtools on a handset. Toggled by the #logbar button; errors
 * auto-open it. Call once at startup.
 */
export function installConsolePanel(): void {
  const box = document.getElementById('log')!;
  const bar = document.getElementById('logbar')!;
  let open = false;

  bar.addEventListener('click', () => {
    open = !open;
    box.classList.toggle('hide', !open);
    bar.innerHTML = open ? 'console &#9652;' : 'console &#9662;';
  });

  const write = (cls: string, args: unknown[]): void => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = args
      .map((a) =>
        typeof a === 'object' && a !== null
          ? (a as { message?: string }).message ?? JSON.stringify(a)
          : String(a),
      )
      .join(' ');
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    if (cls === 'e' && !open) bar.dispatchEvent(new Event('click'));
  };

  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args: unknown[]) => {
    orig.log.apply(console, args);
    write('', args);
  };
  console.warn = (...args: unknown[]) => {
    orig.warn.apply(console, args);
    write('w', args);
  };
  console.error = (...args: unknown[]) => {
    orig.error.apply(console, args);
    write('e', args);
  };

  window.addEventListener('error', (e) =>
    write('e', ['Uncaught:', e.message, 'at', `${e.filename || ''}:${e.lineno || '?'}`]),
  );
  window.addEventListener('unhandledrejection', (e) =>
    write('e', ['Promise rejected:', (e.reason && e.reason.message) || e.reason]),
  );
  console.log('console ready');
}
