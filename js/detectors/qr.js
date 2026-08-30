import jsQR from "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm";

export function detectQR(imageData, width, height) {
  const hit = jsQR(imageData.data, width, height, {
    inversionAttempts: "attemptBoth"
  });

  if (!hit) return [];

  return [{
    type: "QR",
    value: hit.data,
    corners: [
      hit.location.topLeftCorner,
      hit.location.topRightCorner,
      hit.location.bottomRightCorner,
      hit.location.bottomLeftCorner
    ],
    meta: "QR code"
  }];
}
