import crypto from "crypto";
import geoip from "geoip-lite";

export const DEVICE_COOKIE_NAME = "trusted_device";

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const generateSecureToken = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const getClientIp = (req) => {
  let ip = req.ip || req.socket?.remoteAddress || "";

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip;
};

export const getIpLocation = (ip) => {
  if (!ip || ip === "127.0.0.1") {
    return {
      country: "LOCAL",
      city: "Localhost",
    };
  }

  const geo = geoip.lookup(ip);

  return {
    country: geo?.country || "UNKNOWN",
    city: geo?.city || "Unknown",
  };
};

export const getCookieValue = (req, name) => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
};

export const setTrustedDeviceCookie = (res, rawToken) => {
  res.cookie(DEVICE_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365,
    path: "/",
  });
};

export const clearTrustedDeviceCookie = (res) => {
  res.clearCookie(DEVICE_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
};

export const normalizeDeviceInfo = (device = {}) => {
  return {
    deviceName:
      typeof device.deviceName === "string"
        ? device.deviceName.slice(0, 100)
        : "Unknown Device",

    browser:
      typeof device.browser === "string"
        ? device.browser.slice(0, 100)
        : "Unknown Browser",

    platform:
      typeof device.platform === "string"
        ? device.platform.slice(0, 100)
        : "Unknown Platform",

    userAgent:
      typeof device.userAgent === "string"
        ? device.userAgent.slice(0, 500)
        : "",

    screenResolution:
      typeof device.screenResolution === "string"
        ? device.screenResolution.slice(0, 50)
        : "",

    timezone:
      typeof device.timezone === "string"
        ? device.timezone.slice(0, 100)
        : "",

    fingerprint:
      typeof device.fingerprint === "string"
        ? device.fingerprint.slice(0, 200)
        : "",
  };
};

export const getRequestSecurityInfo = (req) => {
  const ip = getClientIp(req);
  const location = getIpLocation(ip);
  const device = normalizeDeviceInfo(req.body?.device);

  return {
    ...device,
    ip,
    country: location.country,
    city: location.city,
  };
};