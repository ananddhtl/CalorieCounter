const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function fixManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Add tools namespace to manifest root
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    if (!application["meta-data"]) {
      application["meta-data"] = [];
    }

    // Find existing firebase color meta-data and patch it
    const existing = application["meta-data"].find(
      (m) =>
        m.$?.["android:name"] ===
        "com.google.firebase.messaging.default_notification_color",
    );

    if (existing) {
      // Already exists — just add the replace attribute
      existing.$["tools:replace"] = "android:resource";
    } else {
      // Doesn't exist — add it fresh
      application["meta-data"].push({
        $: {
          "android:name":
            "com.google.firebase.messaging.default_notification_color",
          "android:resource": "@color/notification_icon_color",
          "tools:replace": "android:resource",
        },
      });
    }

    return config;
  });
};
