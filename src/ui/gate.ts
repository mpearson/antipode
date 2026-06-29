/** The start gate: title screen, spinner, error line, and the Begin button. */
export class Gate {
  private gate = document.getElementById('gate')!;
  private startBtn = document.getElementById('start')!;
  private spin = document.getElementById('spin')!;
  private errEl = document.getElementById('err')!;
  private hud = document.getElementById('hud')!;
  private reticle = document.getElementById('reticle')!;

  /** Run `onBegin` when the user taps Begin; surfaces thrown errors on the gate. */
  onBegin(handler: () => Promise<void>): void {
    this.startBtn.addEventListener('click', () => {
      this.errEl.textContent = '';
      this.spin.classList.remove('hide');
      handler().catch((e) => this.fail(e));
    });
  }

  /** Soft notice (non-fatal, e.g. location fallback). */
  notice(msg: string): void {
    this.errEl.textContent = msg;
  }

  fail(e: unknown): void {
    console.error('startup failed:', e);
    this.spin.classList.add('hide');
    const msg = e instanceof Error ? e.message : String(e);
    this.errEl.textContent = 'Could not start: ' + msg;
  }

  /** Hide the gate and reveal the live view. */
  enterView(): void {
    this.spin.classList.add('hide');
    this.gate.classList.add('hide');
    this.hud.classList.remove('hide');
    this.reticle.classList.remove('hide');
  }
}
