// services/mqttClient.js
import mqtt from "mqtt";
import { ackTopic } from "../utils/mqttTopics.js";

let client;
let ioRef = null; // optional Socket.IO bridge

export const setSocket = (io) => { ioRef = io; };

export const startMqtt = () => {
  if (client) return client;

  const url = process.env.MQTT_URL;
  const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: process.env.MQTT_CLIENT_ID || `gridsense-${Date.now()}`,
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 30000,
    // TLS: HiveMQ Cloud requires TLS; mqtts:// already implies it.
    rejectUnauthorized: true,
  };

  client = mqtt.connect(url, options);

  client.on("connect", () => {
    console.log("[MQTT] Connected");
    // Subscribe to acks from all channels so we can forward to UI
    client.subscribe(ackTopic("+"), { qos: 1 }, (err) => {
      if (err) console.error("[MQTT] subscribe error:", err.message);
    });
  });

  client.on("reconnect", () => console.log("[MQTT] Reconnecting..."));
  client.on("close",     () => console.log("[MQTT] Connection closed"));
  client.on("error",     (err) => console.error("[MQTT] Error:", err?.message));

  client.on("message", (topic, buf) => {
    try {
      const payload = JSON.parse(buf.toString());
      // Forward device ACKs to web clients (room = channelId)
      // topic pattern: <prefix>/devices/<channelId>/ack
      const parts = topic.split("/");
      const channelId = parts[2]; // ["gridsense","devices","<channelId>","ack"]

      if (ioRef) {
        ioRef.to(channelId).emit("device:ack", { topic, payload, at: new Date().toISOString() });
      }
    } catch (e) {
      console.error("[MQTT] message parse error:", e.message);
    }
  });

  return client;
};

export const publish = (topic, message, { qos, retain } = {}) =>
  new Promise((resolve, reject) => {
    if (!client || !client.connected) return reject(new Error("MQTT not connected"));
    const opts = {
      qos: Number(process.env.MQTT_QOS ?? 1),
      retain: String(process.env.MQTT_RETAIN ?? "false") === "true",
      ...(qos !== undefined ? { qos } : {}),
      ...(retain !== undefined ? { retain } : {}),
    };
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    client.publish(topic, payload, opts, (err) => (err ? reject(err) : resolve()));
  });
