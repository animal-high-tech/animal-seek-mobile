const appJson = require('./app.json');

/**
 * Dynamic Expo config.
 *
 * Nearby Interaction entitlements are Apple-granted and can differ by team/app.
 *
 * Common keys:
 * - Standard Nearby Interaction (UWB): `com.apple.developer.nearby-interaction`
 * - Nearby Interaction DL‑TDoA (development): `com.apple.developer.nearbyinteraction.dltdoa`
 *
 * You may have DL‑TDoA enabled without having the standard entitlement approved.
 * In that case, requesting `com.apple.developer.nearby-interaction` will fail signing.
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

  // Select which entitlement(s) to request.
  // - standard: com.apple.developer.nearby-interaction
  // - dltdoa:  com.apple.developer.nearbyinteraction.dltdoa
  // - both:    request both
  // - none:    request neither
  //
  // Default behavior:
  // - Non-production builds default to "dltdoa" (to match many teams' available entitlement during early dev)
  // - Production builds default to "standard" (only if ENABLE_PROD_NEARBY_INTERACTION=1)
  const entitlementModeRaw = String(process.env.NEARBY_INTERACTION_ENTITLEMENT_MODE || '').trim().toLowerCase();
  const defaultMode = isProduction ? 'standard' : 'dltdoa';
  const entitlementMode =
    entitlementModeRaw === 'standard' ||
    entitlementModeRaw === 'dltdoa' ||
    entitlementModeRaw === 'both' ||
    entitlementModeRaw === 'none'
      ? entitlementModeRaw
      : defaultMode;

  const ios = { ...(base.ios ?? {}) };
  const infoPlist = { ...(ios.infoPlist ?? {}) };
  const entitlements = { ...(ios.entitlements ?? {}) };

  // Always start from a "clean" base to avoid duplicated keys.
  delete entitlements['com.apple.developer.nearby-interaction'];
  delete entitlements['com.apple.developer.nearbyinteraction.dltdoa'];
  delete infoPlist.NSNearbyInteractionUsageDescription;

  if (enableNearbyInteraction) {
    const wantStandard = entitlementMode === 'standard' || entitlementMode === 'both';
    const wantDltdoa = entitlementMode === 'dltdoa' || entitlementMode === 'both';

    if (wantStandard) entitlements['com.apple.developer.nearby-interaction'] = true;
    if (wantDltdoa) entitlements['com.apple.developer.nearbyinteraction.dltdoa'] = true;

    if (wantStandard || wantDltdoa) {
      infoPlist.NSNearbyInteractionUsageDescription =
        'Animal Seek uses Nearby Interaction (UWB) to measure direction and distance to group members.';
    }
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

