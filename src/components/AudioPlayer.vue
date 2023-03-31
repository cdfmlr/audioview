<script setup lang="ts">
import { usePlayer } from "./player";
let player = usePlayer();

// connect to server(s)
// wsAddrs from url query
let urlParams = new URLSearchParams(window.location.search);
let wsAddrs = urlParams.getAll("wsAddrs");
for (let wsAddr of wsAddrs) {
  if (!wsAddr || wsAddr.trim().length === 0) continue;
  console.log("connecting to controller", wsAddr);
  player.connectController(wsAddr);
}
</script>

<template></template>

<style scoped>
* {
  background-color: #0000;
  width: 0;
  height: 0;
}
</style>
