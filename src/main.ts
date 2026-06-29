import './style.css';
import { App } from './app';
import { Gate } from './ui/gate';
import { installConsolePanel } from './ui/console';

installConsolePanel();

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const app = new App(canvas);
const gate = new Gate();

// The Begin tap drives startup so the (iOS) motion-permission prompt happens
// inside a user gesture. Geolocation, sensors, and the render loop all start here.
gate.onBegin(async () => {
  await app.begin((msg) => gate.notice(msg));
  gate.enterView();
});
