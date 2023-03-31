import { Howl, Howler } from "howler";

export const FX_VOLUME = 1;
export const SING_VOLUME = 1;
export const VOCAL_VOLUME = 1;
export const VOCAL_FADEIN_VOLUME = VOCAL_VOLUME / 2;
export const BGM_VOLUME = (VOCAL_VOLUME * 2) / 8;
export const SING_VOLUME_ON_VOCAL = (VOCAL_VOLUME * 4) / 6;
export const SING_FADEIN_VOLUME = 0;

export const FADE_TIME = 1000;
export const VOCAL_START_DELAY = FADE_TIME / 4;

const KEEP_ALIVE_INTERVAL = 30000;

/**
 * PlayMode indicates when to play it:
 * - next: put in the tail of the queue, play from the head. (default)
 * - now: stop current and play it immediately, then play original queue.
 * - resetNext: wait current end and clear the queue, then play it.
 * - resetNow: play immediately, stop current and clear the queue.
 */
export enum PlayMode {
  Next = "next",
  Now = "now",
  ResetNext = "resetNext",
  ResetNow = "resetNow",
}

/**
 * Track is a sound (src + options) to play.
 */
export interface Track {
  src: string;
  format?: string;
  volume?: number;
  playMode?: PlayMode;
}

/**
 * Channel wraps Howls, playing them in sequence.
 */
class Channel {
  private current: Howl | undefined;
  private queue: Track[] = []; // next to play

  public volume: number = 1;
  public loop: boolean = false;

  constructor(volume: number = 1, loop: boolean = false) {
    this.volume = volume;
    this.loop = loop;
  }

  public play(sound: Track | string) {
    if (typeof sound === "string") {
      sound = { src: sound };
    }
    if (sound.volume === undefined) {
      sound.volume = this.volume;
    }
    if (sound.playMode === undefined) {
      sound.playMode = PlayMode.Next;
    }

    switch (sound.playMode) {
      case PlayMode.ResetNow:
        this.current?.stop();
        this.current?.unload();

        this.queue = [sound];
        this.playNext();
        break;
      case PlayMode.Now:
        this.current?.stop();
        this.current?.unload();

        this.queue.shift();
        this.queue.unshift(sound);

        this.playNext();
        break;
      case PlayMode.ResetNext:
        this.queue = [sound];
        if (!this.playing()) {
          this.playNext();
        }
        break;
      case PlayMode.Next:
        this.queue.push(sound);
        if (!this.playing()) {
          this.playNext();
        }
        break;
    }
  }

  private playNext() {
    if (this.queue.length === 0) {
      return;
    }
    let next = this.queue[0];
    this.current = new Howl({
      src: [next.src],
      loop: this.loop,
      volume: next.volume,
      autoplay: true,
    });
    this.current.on("end", () => {
      if (this.loop && this.queue.length > 1) {
        // loop 模式下，有下一首，则停止循环，播放下一首，然后把当前歌曲放到队列尾部
        this.current?.stop();
        this.queue.push(this.queue.shift()!);
        this.playNext();
        return;
      }
      this.queue.shift();
      this.playNext();
    });
  }

  public playing(): boolean {
    return this.current?.playing() ?? false;
  }

  public fade(from: number, to: number, duration: number) {
    this.volume = to;
    this.current?.fade(from, to, duration);
  }

  public once(event: string, callback: Function) {
    this.current?.once(event, () => callback());
  }
}

/**
 * Player is a multi-channel audio player.
 * It can play multiple sounds at the same time:
 *
 * - Bgm: background music in 25% volume, looped
 * - Fx: sound effects in 100% volume, once
 * - Sing: singing in 100% volume, mutes Bgm
 * - Vocal: voice (saying) in 100% volume. Will fade Sing to 50% volume.
 */
class Player {
  public Bgm: Channel = new Channel(BGM_VOLUME, true);
  public Fx: Channel = new Channel(FX_VOLUME, false);
  public Sing: Channel = new Channel(SING_VOLUME, false);
  public Vocal: Channel = new Channel(VOCAL_VOLUME, false);

  // why keeps a list of wscontrollers?
  // emmm, I just want to indicate that multiple wscontrollers are supported.
  private wscontrollers: WebSocket[] = [];

  public playBgm(bgm: Track | string) {
    this.Bgm.play(bgm);
  }

  public playFx(fx: Track | string) {
    this.Fx.play(fx);
  }

  public playSing(sing: Track | string) {
    this.Bgm.fade(BGM_VOLUME, 0, FADE_TIME);
    this.Sing.play(sing);
    this.Sing.fade(SING_FADEIN_VOLUME, SING_VOLUME, FADE_TIME);
    this.Sing.once("end", () => {
      this.Bgm.fade(0, BGM_VOLUME, FADE_TIME);
    });
  }

  public playVocal(vocal: Track | string) {
    this.Sing.fade(SING_VOLUME, SING_VOLUME_ON_VOCAL, FADE_TIME);
    setTimeout(() => {
      this.Vocal.play(vocal);
      this.Vocal.fade(VOCAL_FADEIN_VOLUME, VOCAL_VOLUME, FADE_TIME);
    }, VOCAL_START_DELAY);
    this.Vocal.once("end", () => {
      this.Sing.fade(SING_VOLUME_ON_VOCAL, SING_VOLUME, FADE_TIME);
    });
  }

  /**
   * connectController connects to a player controller via websocket.
   *
   * A player controller is a websocket server that can control the player,
   * that is a server sends following commands to the player:
   *
   * - playBgm:` { cmd: "playBgm", data: Track | string }`
   * - playFx: `{ cmd: "playFx", data: Track | string }`
   * - playSing: `{ cmd: "playSing", data: Track | string }`
   * - playVocal: `{ cmd: "playVocal", data: Track | string }`
   * - keepAlive: `{ cmd: "keepAlive" }` for every 30 seconds (both sides do this)
   *
   * data is a Track object (that is, `{ src: string, volume?: number, playMode?: PlayMode }`)
   *  or a string (url: `"http://xxx"` or data base64: `"data:audio/mp3;base64,xxxx"`)
   *
   * Multiple calls to connectController will connect to multiple controllers.
   * All commands from all controllers will be handled.
   *
   * @param wsAddr controller's websocket address
   */
  public connectController(wsAddr: string) {
    const ws = new WebSocket(wsAddr);

    ws.onopen = () => {
      console.log("connected to controller");
      this.wscontrollers.push(ws);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.cmd) {
        case "playBgm":
          this.playBgm(msg.data);
          break;
        case "playFx":
          this.playFx(msg.data);
          break;
        case "playSing":
          this.playSing(msg.data);
          break;
        case "playVocal":
          this.playVocal(msg.data);
          break;
        case "keepAlive":
          break;
        default:
          console.warn(`unknown command: ${msg.cmd}`);
      }
    };
    ws.onclose = () => {
      console.log("disconnected from controller");
      this.wscontrollers = this.wscontrollers.filter((c) => c !== ws);
    };
    ws.onerror = (e) => {
      console.error(e);
      this.wscontrollers = this.wscontrollers.filter((c) => c !== ws);
    };

    // keep alive
    setInterval(() => {
      ws.send(JSON.stringify({ cmd: "keepAlive" }));
    }, KEEP_ALIVE_INTERVAL);
  }
}

// Player singleton
const player = new Player();

/**
 * usePlayer returns the Player singleton.
 * @returns the Player singleton
 */
export function usePlayer() {
  return player;
}
