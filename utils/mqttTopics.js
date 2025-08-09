// utils/mqttTopics.js
const prefix = process.env.MQTT_PREFIX || "gridsense";

// Device → Cloud telemetry (what you already store)
export const telemetryTopic = (channelId) =>
  `${prefix}/devices/${channelId}/telemetry`;

// Cloud → Device commands
export const commandTopic = (channelId) =>
  `${prefix}/devices/${channelId}/commands`;

// Device → Cloud ack for commands (optional but useful)
export const ackTopic = (channelId = "+") =>
  `${prefix}/devices/${channelId}/ack`;
