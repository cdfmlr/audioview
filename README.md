# Audio View

> 🔑 This is a muli component. You can find the main repository [here](https://github.com/cdfmlr/muvtuber).

这个程序负责播放音频。这个程序从通过 WebSocket 连接到 driver，driver 在需要时将要播放的音频文件发送过来，这个程序会通过浏览器进行播放。

Goto the [main repository](https://github.com/cdfmlr/muvtuber) for more information.

## Usage

在浏览器中打开 Audio View，并链接到 driver （a.k.a. controller）：

```http
http://127.0.0.1:51082/?controller=ws://127.0.0.1:51081/
```

打开后，会看到**空白**页面。这是正常的，Audio view 目前只播放音频，没有界面，所以是空白的。

### Multi Channels

Audio view 针对直播场景，被设计为可以同时播放多种音频（多个 channel）：

- Bgm: 背景音乐
- Fx: 临时的效果
- Vocal: 主播说话
- Sing: 主播唱歌

Audio View 会在播放相应内容时，调节其他 channel 的音量到合适的大小（比如 Sing 时就没有 Bgm 了）。

### WebSocket message:

Audio view 接收并处理来自 controller 的如下消息：

- playBgm:` { cmd: "playBgm", data: Track }`
- playFx: `{ cmd: "playFx", data: Track }`
- playSing: `{ cmd: "playSing", data: Track }`
- playVocal: `{ cmd: "playVocal", data: Track }`
- keepAlive: `{ cmd: "keepAlive" }` for every 30 seconds (both sides do this)

其中，Track 对象是对要播放的音频以及播放选项的封装：

```ts
interface Track {
  id?: string;
  src: string;
  format?: string;
  volume?: number;
  playMode?: PlayMode;
}
```

 PlayMode indicates when to play it:
 
- `"next"`: put in the tail of the queue, play from the head. (default)
- `"now"`: stop current and play it immediately, then play original queue.
- `"resetNext"`: wait current end and clear the queue, then play it.
- `"resetNow"`: play immediately, stop current and clear the queue.

## Internal: Vue 3 + TypeScript + Vite

This project is developed with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

### Type Support For `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.
