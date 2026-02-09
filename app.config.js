const appJson = require('./app.json');

/**
 * Dynamic Expo config.
 *
 * Nearby Interaction (UWB) entitlements vary by provisioning type.
 *
 * - Internal / Ad Hoc builds: use DL‑TDoA entitlement key
 *   `com.apple.developer.nearbyinteraction.dltdoa`
 * - Production (App Store): use the standard entitlement key
 *   `com.apple.developer.nearby-interaction`
 *
 * IMPORTANT: your iOS provisioning profile must include this entitlement
 * (enable the capability on your Apple App ID and regenerate the profile),
 * otherwise Xcode will fail during archive/signing.
 */
module.exports = () => {
  const base = appJson.expo ?? {};
  const profile = process.env.EAS_BUILD_PROFILE;
  const isProduction = profile === 'production';

  // Apple may not grant the production entitlement until your Team/App ID is approved.
  // Default: do NOT request Nearby Interaction in production builds.
  // Flip to "1" once Apple enables it for your App ID:
  //   ENABLE_PROD_NEARBY_INTERACTION=1 eas build -p ios --profile production
  const enableProdNearby = process.env.ENABLE_PROD_NEARBY_INTERACTION === '1';
  const enableNearbyInteraction = !isProduction || enableProdNearby;
  const nearbyEntitlementKey =
    isProduction ? 'com.apple.developer.nearby-interaction' : 'com.apple.developer.nearbyinteraction.dltdoa';

  const ios = { ...(base.ios ?? {}) };
  const infoPlist = { ...(ios.infoPlist ?? {}) };
  const entitlements = { ...(ios.entitlements ?? {}) };

  // Always start from a "clean" base to avoid duplicated keys.
  delete entitlements['com.apple.developer.nearby-interaction'];
  delete entitlements['com.apple.developer.nearbyinteraction.dltdoa'];
  delete infoPlist.NSNearbyInteractionUsageDescription;

  if (enableNearbyInteraction) {
    entitlements[nearbyEntitlementKey] = true;
    infoPlist.NSNearbyInteractionUsageDescription =
      'Animal Seek uses Nearby Interaction (UWB) to measure direction and distance to group members.';
  }

  const cleanedEntitlements =
    Object.keys(entitlements).length > 0 ? entitlements : undefined;

  return {
    ...base,
    ios: {
      ...ios,
      infoPlist,
      ...(cleanedEntitlements ? { entitlements: cleanedEntitlements } : {}),
    },
  };
};

