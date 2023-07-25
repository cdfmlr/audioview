<script setup lang="ts">
import { onMounted, watch } from "vue";
import { usePlayer, WsController } from "./player";

let player = usePlayer();
let controller = new WsController(player);

function connectToControllers() {
  // connect to server(s)
  // wsAddrs from url query
  let urlParams = new URLSearchParams(window.location.search);
  let wsAddrs = urlParams.getAll("controller");
  for (let wsAddr of wsAddrs) {
    if (!wsAddr || wsAddr.trim().length === 0) continue;
    console.log("connecting to controller", wsAddr);
    controller.dial(wsAddr);
  }
}

onMounted(() => {
  connectToControllers();
});

setInterval(() => {
  if (controller.toBeReset) {
    console.log("reset audioview.");
    // reload page
    window.location.reload();
  }
  if (controller.wscontrollers.length === 0) {
    console.log("no controllers connected. trying to connect...");
    connectToControllers();
  }
}, 1000 * 5);
</script>

<template></template>

<style scoped>
* {
  background-color: #0000;
  width: 0;
  height: 0;
}
</style>
