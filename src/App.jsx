import {
  BookOpen,
  CalendarDays,
  ChevronUp,
  CirclePause,
  CirclePlay,
  ExternalLink,
  Hourglass,
  Link as LinkIcon,
  Mail,
  Music2,
  Quote,
  Repeat,
  Repeat1,
  Rss,
  Send,
  Shuffle,
  SkipForward,
  ShoppingCart,
  Volume2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";

const CONFIG_URL = "/config/site.config.json";
const PLAYER_STORAGE_KEY = "home:player-state";
const WEATHER_STORAGE_KEY = "home:weather-cache";
const PLAYER_MODES = new Set(["order", "single", "random"]);
const PLAYER_IDLE_DELAY = 3000;
const QQ_MUSIC_GUID = "10000";
const WEATHER_CODES = {
  0: "晴",
  1: "大部晴朗",
  2: "局部多云",
  3: "阴",
  45: "有雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "浓毛毛雨",
  56: "冻毛毛雨",
  57: "强冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "小阵雨",
  81: "阵雨",
  82: "强阵雨",
  85: "小阵雪",
  86: "强阵雪",
  95: "雷暴",
  96: "雷暴伴冰雹",
  99: "强雷暴伴冰雹",
};
const POSTER_BACKGROUND_IMAGES = {
  landscape: [
    "/chou-kaguyahime-posters/landscape/official-kv-01.jpg",
    "/chou-kaguyahime-posters/landscape/official-kv-02.jpg",
    "/chou-kaguyahime-posters/landscape/official-kv-03.jpg",
    "/chou-kaguyahime-posters/landscape/yachiyo-landscape-1980x1080.png",
    "/chou-kaguyahime-posters/landscape/yachiyo-landscape-2103x1200.jpg",
    "/chou-kaguyahime-posters/landscape/yachiyo-large-4320x3400.jpg",
  ],
  portrait: [
    "/chou-kaguyahime-posters/portrait/official-yachiyo-wallpaper-01.png",
    "/chou-kaguyahime-posters/portrait/official-yachiyo-wallpaper-02.png",
  ],
};

const defaultConfig = {
  version: "fallback",
  refreshInterval: 5000,
  site: {
    name: "Yachiyo",
    owner: "Yachiyo",
    logoText: "Yachiyo",
    logoImage: "",
    quote: {
      title: "Ex-Otogibanashi",
      text: "めちゃくちゃ笑ってるのに 涙止まんない",
    },
    secretQuote: {
      title: "Oops!",
      text: "哎呀，这都被你发现了（再点击一次可关闭）",
    },
    copyright: "Copyright © 2026 & Made by Yachiyo",
    birthday: "2022-05-07T00:00:00+08:00",
  },
  locale: {
    autoDetect: true,
    fallbackLocale: "zh-CN",
    fallbackTimeZone: "Asia/Shanghai",
    weatherFallback: {
      city: "广州市",
    },
  },
  weather: {
    enabled: true,
    provider: "open-meteo",
    forecastEndpoint: "https://api.open-meteo.com/v1/forecast",
    geocodingEndpoint: "https://geocoding-api.open-meteo.com/v1/search",
    autoDetectLocation: true,
    requestLocationPermission: false,
    city: "广州市",
    latitude: 23.1291,
    longitude: 113.2644,
    cacheTtl: "today",
  },
  appearance: {
    accent: "#ff9fb5",
    accent2: "#9ad7ff",
    backgroundImage: "",
    enableMotion: true,
    glassStrength: 0.72,
  },
  hitokoto: {
    enabled: true,
    endpoint: "https://v1.hitokoto.cn/",
    refreshInterval: 3600000,
  },
  socials: [],
  links: [],
  player: {
    enabled: false,
    provider: "static",
    playlistUrl: "",
    autoplay: false,
    title: "夜间频道",
    artist: "Yachiyo radio",
  },
};

const iconMap = {
  github: FaGithub,
  calendar: CalendarDays,
  mail: Mail,
  music: Music2,
  send: Send,
  rss: Rss,
  "book-open": BookOpen,
  "shopping-cart": ShoppingCart,
  link: LinkIcon,
};

function mergeConfig(config) {
  return {
    ...defaultConfig,
    ...config,
    site: {
      ...defaultConfig.site,
      ...(config?.site ?? {}),
      quote: {
        ...defaultConfig.site.quote,
        ...(config?.site?.quote ?? {}),
      },
      secretQuote: {
        ...defaultConfig.site.secretQuote,
        ...(config?.site?.secretQuote ?? {}),
      },
    },
    locale: {
      ...defaultConfig.locale,
      ...(config?.locale ?? {}),
      weatherFallback: {
        ...defaultConfig.locale.weatherFallback,
        ...(config?.locale?.weatherFallback ?? {}),
      },
    },
    appearance: {
      ...defaultConfig.appearance,
      ...(config?.appearance ?? {}),
    },
    hitokoto: {
      ...defaultConfig.hitokoto,
      ...(config?.hitokoto ?? {}),
    },
    weather: {
      ...defaultConfig.weather,
      ...(config?.weather ?? {}),
    },
    player: {
      ...defaultConfig.player,
      ...(config?.player ?? {}),
    },
    socials: config?.socials ?? defaultConfig.socials,
    links: config?.links ?? defaultConfig.links,
  };
}

async function fetchRuntimeConfig() {
  const response = await fetch(`${CONFIG_URL}?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${CONFIG_URL}: ${response.status}`);
  }

  return mergeConfig(await response.json());
}

function useRuntimeConfig() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState("loading");
  const [updatedAt, setUpdatedAt] = useState(null);
  const versionRef = useRef(defaultConfig.version);
  const refreshIntervalRef = useRef(defaultConfig.refreshInterval);

  useEffect(() => {
    let alive = true;
    let timer;

    async function loadConfig() {
      try {
        const next = await fetchRuntimeConfig();

        if (!alive) return;
        const serialized = JSON.stringify(next);

        setConfig((current) => {
          const currentSerialized = JSON.stringify(current);
          return currentSerialized === serialized ? current : next;
        });
        refreshIntervalRef.current = next.refreshInterval;
        setStatus("synced");

        if (versionRef.current !== next.version) {
          versionRef.current = next.version;
          setUpdatedAt(new Date());
        }
      } catch (error) {
        if (!alive) return;
        setStatus("offline");
        console.warn(error);
      }
    }

    function schedule() {
      timer = window.setTimeout(async () => {
        await loadConfig();
        if (alive) schedule();
      }, Math.max(2500, Number(refreshIntervalRef.current) || 5000));
    }

    loadConfig().then(schedule);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  return { config, status, updatedAt };
}

function useClock(config) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const locale =
      config.locale.autoDetect && navigator.language
        ? navigator.language
        : config.locale.fallbackLocale;
    const timeZone =
      config.locale.autoDetect
        ? Intl.DateTimeFormat().resolvedOptions().timeZone ||
          config.locale.fallbackTimeZone
        : config.locale.fallbackTimeZone;

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    return {
      date: dateFormatter.format(now),
      time: timeFormatter.format(now),
      timeZone,
      locale,
    };
  }, [config.locale, now]);
}

function useProgress(birthday) {
  return useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    const day = startOfDay.getDay() || 7;
    startOfWeek.setDate(startOfDay.getDate() - day + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const nextDay = new Date(startOfDay);
    nextDay.setDate(startOfDay.getDate() + 1);
    const nextWeek = new Date(startOfWeek);
    nextWeek.setDate(startOfWeek.getDate() + 7);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextYear = new Date(now.getFullYear() + 1, 0, 1);
    const birth = birthday ? new Date(birthday) : null;
    const aliveAge =
      birth && !Number.isNaN(birth.getTime())
        ? formatDateDuration(birth, now)
        : null;

    return [
      {
        label: "今日已经度过了",
        value: `${Math.floor((now - startOfDay) / 3600000)} 小时`,
        percent: percent(now, startOfDay, nextDay),
      },
      {
        label: "本周已经度过了",
        value: `${Math.floor((now - startOfWeek) / 86400000) + 1} 天`,
        percent: percent(now, startOfWeek, nextWeek),
      },
      {
        label: "本月已经度过了",
        value: `${now.getDate()} 天`,
        percent: percent(now, startOfMonth, nextMonth),
      },
      {
        label: "今年已经度过了",
        value: `${now.getMonth() + 1} 个月`,
        percent: percent(now, startOfYear, nextYear),
      },
      {
        label: "本站已经苟活了",
        value: aliveAge ?? "一些日子",
        percent: null,
      },
    ];
  }, [birthday]);
}

function useHitokoto(config) {
  const fallback = useMemo(
    () => ({
      text: config.site.quote.text,
      source: config.site.quote.title,
    }),
    [config.site.quote.text, config.site.quote.title],
  );
  const [hitokoto, setHitokoto] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setHitokoto(fallback);
  }, [fallback]);

  useEffect(() => {
    if (!config.hitokoto.enabled) return undefined;

    let alive = true;
    let timer;

    async function loadHitokoto() {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);

      try {
        const response = await fetch(config.hitokoto.endpoint, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Hitokoto request failed: ${response.status}`);
        }

        const data = await response.json();
        if (!alive || requestIdRef.current !== requestId || !data?.hitokoto) {
          return;
        }

        const source = [data.from_who, data.from].filter(Boolean).join(" · ");
        setHitokoto({
          text: data.hitokoto,
          source: source ? `- ${source}` : fallback.source,
        });
      } catch (error) {
        if (!alive) return;
        console.warn(error);
        setHitokoto(fallback);
      } finally {
        if (alive && requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }

    function schedule() {
      timer = window.setTimeout(async () => {
        await loadHitokoto();
        if (alive) schedule();
      }, Math.max(60000, Number(config.hitokoto.refreshInterval) || 3600000));
    }

    loadHitokoto().then(schedule);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [config.hitokoto.enabled, config.hitokoto.endpoint, config.hitokoto.refreshInterval, fallback]);

  const refreshHitokoto = async () => {
    if (!config.hitokoto.enabled || loading) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      const response = await fetch(config.hitokoto.endpoint, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Hitokoto request failed: ${response.status}`);
      }

      const data = await response.json();
      if (requestIdRef.current !== requestId || !data?.hitokoto) return;

      const source = [data.from_who, data.from].filter(Boolean).join(" · ");
      setHitokoto({
        text: data.hitokoto,
        source: source ? `- ${source}` : fallback.source,
      });
    } catch (error) {
      console.warn(error);
      setHitokoto(fallback);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  return { hitokoto, refreshHitokoto, loading };
}

function useWeather(config, clock) {
  const cacheKey = useMemo(
    () => getWeatherCacheKey(config.weather, clock),
    [clock.locale, clock.timeZone, config.weather],
  );
  const todayKey = useMemo(
    () => getLocalDateKey(new Date(), clock.locale, clock.timeZone),
    [clock.date, clock.locale, clock.timeZone],
  );
  const [weather, setWeather] = useState(() =>
    readWeatherCache(cacheKey, todayKey) ?? createEmptyWeather(),
  );

  useEffect(() => {
    if (!config.weather.enabled || config.weather.provider !== "open-meteo") {
      return undefined;
    }

    let alive = true;
    const cached = readWeatherCache(cacheKey, todayKey);
    if (cached) {
      setWeather(cached);
      return () => {
        alive = false;
      };
    }

    setWeather(createEmptyWeather());

    async function loadWeather() {
      try {
        const location = await resolveWeatherLocation(config, clock.locale);
        if (!alive || !location) return;

        const params = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m",
          timezone: clock.timeZone || "auto",
          forecast_days: "1",
        });
        const response = await fetch(`${config.weather.forecastEndpoint}?${params}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`);
        }

        const data = await response.json();
        if (!alive) return;

        const current = data?.current;
        const units = data?.current_units ?? {};
        if (!current || typeof current.temperature_2m !== "number") {
          throw new Error("Weather response missing current conditions");
        }

        const nextWeather = {
          city: location.label,
          text: formatWeatherText(current, units),
          dateKey: todayKey,
          cacheKey,
          stale: false,
        };

        writeWeatherCache(nextWeather);
        setWeather(nextWeather);
      } catch (error) {
        if (!alive) return;
        console.warn(error);
      }
    }

    loadWeather();

    return () => {
      alive = false;
    };
  }, [cacheKey, clock.locale, clock.timeZone, config, todayKey]);

  return weather.cacheKey === cacheKey && weather.dateKey === todayKey
    ? weather
    : createEmptyWeather();
}

function usePosterBackground() {
  const [background, setBackground] = useState(() =>
    selectPosterBackground(getViewportOrientation()),
  );

  useEffect(() => {
    function handleResize() {
      const orientation = getViewportOrientation();
      setBackground((current) =>
        current.orientation === orientation
          ? current
          : selectPosterBackground(orientation),
      );
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return background;
}

function getViewportOrientation() {
  if (typeof window === "undefined") return "landscape";
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

function selectPosterBackground(orientation) {
  const images =
    POSTER_BACKGROUND_IMAGES[orientation] ?? POSTER_BACKGROUND_IMAGES.landscape;
  return {
    orientation,
    image: images[Math.floor(Math.random() * images.length)],
  };
}

function createEmptyWeather() {
  return {
    city: "",
    text: "",
    dateKey: "",
    cacheKey: "",
    stale: true,
  };
}

function readWeatherCache(cacheKey, todayKey) {
  if (typeof window === "undefined" || !cacheKey || !todayKey) return null;

  try {
    const storage = JSON.parse(window.localStorage.getItem(WEATHER_STORAGE_KEY) || "null");
    const cached = storage?.[cacheKey];

    if (
      cached?.dateKey === todayKey &&
      (!cached.expiresAt || Date.parse(cached.expiresAt) > Date.now()) &&
      typeof cached.city === "string" &&
      typeof cached.text === "string" &&
      cached.text
    ) {
      return {
        city: cached.city,
        text: cached.text,
        dateKey: cached.dateKey,
        cacheKey,
        stale: false,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function writeWeatherCache(weather) {
  if (typeof window === "undefined" || !weather.cacheKey || !weather.dateKey) return;

  try {
    const storage = JSON.parse(window.localStorage.getItem(WEATHER_STORAGE_KEY) || "{}");
    window.localStorage.setItem(
      WEATHER_STORAGE_KEY,
      JSON.stringify({
        ...storage,
        [weather.cacheKey]: {
          city: weather.city,
          text: weather.text,
          dateKey: weather.dateKey,
          savedAt: new Date().toISOString(),
          expiresAt: getWeatherCacheExpiresAt(),
        },
      }),
    );
  } catch {
    // localStorage may be unavailable in private mode; weather can still render for this session.
  }
}

function getWeatherCacheKey(weatherConfig, clock) {
  const source = [
    weatherConfig.provider || "open-meteo",
    weatherConfig.autoDetectLocation ? "auto" : "fixed",
    weatherConfig.city || "",
    weatherConfig.latitude ?? "",
    weatherConfig.longitude ?? "",
    clock.locale || "",
    clock.timeZone || "",
  ];

  return source.map((item) => encodeURIComponent(String(item))).join("|");
}

function getWeatherCacheExpiresAt() {
  const expires = new Date();
  expires.setHours(24, 0, 0, 0);
  return expires.toISOString();
}

function getLocalDateKey(date, locale, timeZone) {
  try {
    return new Intl.DateTimeFormat(locale || "zh-CN", {
      timeZone: timeZone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function resolveWeatherLocation(config, locale) {
  const browserLocation = await getBrowserWeatherLocation(config.weather);
  if (browserLocation) return browserLocation;

  if (isFiniteCoordinate(config.weather.latitude, config.weather.longitude)) {
    return {
      latitude: Number(config.weather.latitude),
      longitude: Number(config.weather.longitude),
      label: config.weather.city || config.locale.weatherFallback.city || "当前位置",
    };
  }

  const cityLocation = await geocodeWeatherCity(config.weather, locale);
  if (cityLocation) return cityLocation;

  return null;
}

async function getBrowserWeatherLocation(weatherConfig) {
  if (
    typeof navigator === "undefined" ||
    !weatherConfig.autoDetectLocation ||
    !navigator.geolocation
  ) {
    return null;
  }

  if (!weatherConfig.requestLocationPermission) {
    const permission = await getGeolocationPermissionState();
    if (permission !== "granted") return null;
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        maximumAge: 1800000,
        timeout: 6000,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label: weatherConfig.locationLabel || "当前位置",
    };
  } catch {
    return null;
  }
}

async function getGeolocationPermissionState() {
  if (typeof navigator === "undefined" || !navigator.permissions) return "prompt";

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "prompt";
  }
}

async function geocodeWeatherCity(weatherConfig, locale) {
  const city = weatherConfig.city?.trim();
  if (!city || !weatherConfig.geocodingEndpoint) return null;

  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: getWeatherLanguage(locale),
    format: "json",
  });
  const response = await fetch(`${weatherConfig.geocodingEndpoint}?${params}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Weather geocoding failed: ${response.status}`);
  }

  const data = await response.json();
  const result = data?.results?.[0];
  if (!result || !isFiniteCoordinate(result.latitude, result.longitude)) return null;

  return {
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    label: [result.name, result.admin1].filter(Boolean).join(" · ") || city,
  };
}

function getWeatherLanguage(locale) {
  return String(locale || "zh-CN").toLowerCase().startsWith("zh") ? "zh" : "en";
}

function isFiniteCoordinate(latitude, longitude) {
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
}

function formatWeatherText(current, units) {
  const temperature = Math.round(current.temperature_2m);
  const temperatureUnit = units.temperature_2m || "°C";
  const summary = WEATHER_CODES[current.weather_code] ?? "天气更新";
  const wind = formatWind(current.wind_speed_10m, current.wind_direction_10m);

  return `${temperature}${temperatureUnit} ${summary}${wind ? ` · ${wind}` : ""}`;
}

function formatWind(speed, direction) {
  if (!Number.isFinite(Number(speed))) return "";

  const level = getBeaufortLevel(Number(speed));
  const directionText = Number.isFinite(Number(direction))
    ? getWindDirection(Number(direction))
    : "";

  return `${directionText}${level}级风`;
}

function getBeaufortLevel(speedKmh) {
  const thresholds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  const index = thresholds.findIndex((threshold) => speedKmh < threshold);
  return index === -1 ? 12 : index;
}

function getWindDirection(degrees) {
  const directions = [
    "北",
    "东北",
    "东",
    "东南",
    "南",
    "西南",
    "西",
    "西北",
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  return directions[Math.round(normalized / 45) % directions.length];
}

function formatDateDuration(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    const previousMonthLastDay = new Date(
      end.getFullYear(),
      end.getMonth(),
      0,
    ).getDate();
    days += previousMonthLastDay;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} 年`);
  if (months > 0) parts.push(`${months} 月`);
  if (days > 0 || parts.length === 0) parts.push(`${days} 天`);
  return parts.join(" ");
}

function percent(now, start, end) {
  const value = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function Icon({ name, size = 20 }) {
  const Component = iconMap[name] ?? LinkIcon;

  if (Component === FaGithub) {
    return <Component size={size} aria-hidden="true" />;
  }

  return <Component size={size} strokeWidth={2.25} aria-hidden="true" />;
}

function SakuraMark({ src, label }) {
  if (src) {
    return (
      <img
        className="logo-image"
        src={src}
        alt=""
        aria-hidden="true"
        title={label}
      />
    );
  }

  return (
    <div className="sakura-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function ConfigPulse({ status, updatedAt }) {
  const label =
    status === "synced"
      ? "config synced"
      : status === "loading"
        ? "config loading"
        : "config offline";

  return (
    <div className="config-pulse" title="运行时配置同步状态">
      <span className={`pulse-dot ${status}`} />
      <span>{label}</span>
      {updatedAt ? <small>{updatedAt.toLocaleTimeString()}</small> : null}
    </div>
  );
}

function QuoteCard({ quote, capsuleOpen, onToggleCapsule }) {
  return (
    <motion.button
      type="button"
      className={`quote-card glass ${capsuleOpen ? "active" : ""}`}
      onClick={onToggleCapsule}
      aria-label={capsuleOpen ? "关闭时光胶囊" : "打开时光胶囊"}
      whileTap={{ scale: 0.985 }}
    >
      <Quote className="quote-left" size={20} fill="currentColor" />
      <div>
        <strong>{quote.title}</strong>
        <p>{quote.text}</p>
      </div>
      <Quote className="quote-right" size={20} fill="currentColor" />
    </motion.button>
  );
}

function SocialRail({ socials }) {
  const visibleSocials = socials
    .map((item) => ({ ...item, url: item.url?.trim() ?? "" }))
    .filter((item) => item.url);

  if (!visibleSocials.length) return null;

  return (
    <nav className="social-rail glass" aria-label="社交媒体">
      {visibleSocials.map((item) => (
        <a
          className="icon-link"
          key={item.id}
          href={item.url}
          aria-label={item.label}
          title={item.label}
          target={item.url?.startsWith("http") ? "_blank" : undefined}
          rel={item.url?.startsWith("http") ? "noreferrer" : undefined}
        >
          <Icon name={item.icon} size={19} />
        </a>
      ))}
    </nav>
  );
}

function InfoCard({ clock, weather, hitokoto, onRefreshHitokoto, hitokotoLoading }) {
  return (
    <section className="info-grid">
      <button
        type="button"
        className={`mini-card glass verse-card ${hitokotoLoading ? "loading" : ""}`}
        onClick={onRefreshHitokoto}
        disabled={hitokotoLoading}
        title="点击换一句"
      >
        <p>{hitokoto.text}</p>
        <strong>{hitokoto.source}</strong>
      </button>
      <div className="mini-card glass clock-card">
        <span>{clock.date}</span>
        <strong>{clock.time}</strong>
        <p className={weather.text ? "weather-line" : "weather-line loading"}>
          {weather.text ? `${weather.city} ${weather.text}` : "\u00a0"}
        </p>
      </div>
    </section>
  );
}

function Links({ links }) {
  return (
    <section className="link-section" aria-label="外链">
      <div className="section-kicker">
        <LinkIcon size={16} />
        <span>Link</span>
      </div>
      <div className="link-grid">
        {links.map((link) => (
          <a
            className="link-card glass"
            href={link.url}
            key={link.id}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name={link.icon} size={24} />
            <span>
              <strong>{link.title}</strong>
              <small>{link.description}</small>
            </span>
            <ExternalLink className="external-icon" size={15} />
          </a>
        ))}
      </div>
    </section>
  );
}

function TimeCapsule({ progress }) {
  return (
    <motion.aside
      className="time-capsule glass"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
    >
      <header>
        <Hourglass size={22} />
        <strong>时光胶囊</strong>
      </header>
      <div className="progress-list">
        {progress.map((item) => (
          <div className="progress-item" key={item.label}>
            <div className="progress-label">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            {item.percent === null ? null : (
              <div className="progress-track">
                <span style={{ width: `${item.percent}%` }}>
                  {item.percent}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.aside>
  );
}

function Player({ player }) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [playerActive, setPlayerActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playMode, setPlayMode] = useState(() => getStoredPlayMode());
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const [restoredStorageKey, setRestoredStorageKey] = useState("");
  const playerRef = useRef(null);
  const audioRef = useRef(null);
  const trackRefs = useRef([]);
  const playRequestRef = useRef(0);
  const playContextRef = useRef({ index: 0, failedIndexes: [] });
  const compactPointerRef = useRef(false);
  const lastAudioErrorRef = useRef("");
  const autoplayStartedRef = useRef(false);
  const restorePlaybackRef = useRef(null);
  const lastSavedSecondRef = useRef(-1);
  const restoredTrackIndexRef = useRef(0);
  const storageKey = useMemo(() => getPlayerStorageKey(player), [
    player.provider,
    player.playlistUrl,
    player.title,
  ]);
  const hasRemotePlaylist = player.provider === "qq" && Boolean(player.playlistUrl);
  const tracks = hasRemotePlaylist ? (playlist?.tracks ?? []) : [];
  const current = tracks[trackIndex] ?? {};
  const cover = current.cover || playlist?.cover;
  const currentTitle = current.title ?? playlist?.title ?? player.title;
  const currentArtist = current.artist || playlist?.title || player.artist;
  const playModeMeta = getPlayModeMeta(playMode);
  const PlayModeIcon = playModeMeta.Icon;

  function wakePlayer() {
    setCompact(false);
  }

  function handlePlayerEnter() {
    setPlayerActive(true);
    wakePlayer();
  }

  function handlePlayerLeave() {
    setPlayerActive(false);
  }

  function handlePlayerPointerDown() {
    compactPointerRef.current = compact;
    wakePlayer();
  }

  function handleTitleButtonClick() {
    if (compactPointerRef.current) {
      compactPointerRef.current = false;
      return;
    }

    setOpen((value) => !value);
  }

  useEffect(() => {
    if (!player.enabled || !hasRemotePlaylist) {
      setPlaylist(null);
      return undefined;
    }

    let alive = true;

    async function loadPlaylist() {
      setLoading(true);
      setError("");
      autoplayStartedRef.current = false;

      try {
        const response = await fetch(
          `/api/qq/playlist?url=${encodeURIComponent(player.playlistUrl)}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "歌单加载失败");
        }

        if (!alive) return;
        setPlaylist(data);
        setTrackIndex(0);
        setAudioSrc("");
      } catch (loadError) {
        if (!alive) return;
        console.warn(loadError);
        setError(loadError.message || "歌单加载失败");
        setPlaylist(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPlaylist();

    return () => {
      alive = false;
    };
  }, [hasRemotePlaylist, player.enabled, player.playlistUrl]);

  useEffect(() => {
    restoredTrackIndexRef.current = 0;
    setRestoredStorageKey("");
  }, [storageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing && audioSrc) {
      audio.play().catch(() => {
        setPlaying(false);
        savePlaybackSnapshot({
          currentTime: playContextRef.current.resumeTime || audio.currentTime,
          wasPlaying: false,
        });
      });
    } else {
      audio.pause();
    }
  }, [playing, audioSrc]);

  useEffect(() => {
    if (!tracks.length || restoredStorageKey === storageKey) {
      return;
    }

    const storage = readPlayerStorage();
    const savedTrack = storage.tracks?.[storageKey];
    const savedIndex = findStoredTrackIndex(tracks, savedTrack);

    restoredTrackIndexRef.current = savedIndex;
    restorePlaybackRef.current = savedTrack
      ? {
          index: savedIndex,
          currentTime: savedTrack.currentTime || 0,
          wasPlaying: Boolean(savedTrack.wasPlaying),
        }
      : null;
    playContextRef.current = { index: savedIndex, failedIndexes: [] };
    setTrackIndex(savedIndex);
    setAudioSrc("");
    setRestoredStorageKey(storageKey);
  }, [restoredStorageKey, storageKey, tracks.length]);

  useEffect(() => {
    if (
      player.autoplay &&
      tracks.length &&
      !audioSrc &&
      !loading &&
      !autoplayStartedRef.current &&
      restoredStorageKey === storageKey
    ) {
      autoplayStartedRef.current = true;
      selectTrack(restoredTrackIndexRef.current, true);
    }
  }, [
    player.autoplay,
    tracks.length,
    audioSrc,
    loading,
    restoredStorageKey,
    storageKey,
  ]);

  useEffect(() => {
    const restore = restorePlaybackRef.current;

    if (
      !restore ||
      !tracks.length ||
      audioSrc ||
      loading ||
      restoredStorageKey !== storageKey
    ) {
      return;
    }

    restorePlaybackRef.current = null;

    if (restore.wasPlaying || restore.currentTime > 0) {
      selectTrack(restore.index, restore.wasPlaying, {
        resumeTime: restore.currentTime,
      });
    }
  }, [
    audioSrc,
    loading,
    restoredStorageKey,
    storageKey,
    tracks.length,
  ]);

  useEffect(() => {
    updatePlayerStorage((storage) => ({
      ...storage,
      playMode,
    }));
  }, [playMode]);

  function saveTrackSnapshot(index, options = {}) {
    const track = tracks[index];

    if (
      !track ||
      !tracks.length ||
      restoredStorageKey !== storageKey
    ) {
      return;
    }

    const audio = audioRef.current;
    const fallbackTime =
      playContextRef.current.index === index
        ? playContextRef.current.resumeTime || 0
        : 0;
    const audioTime = audio?.currentTime ?? 0;
    const currentTime = options.currentTime ?? (audioTime || fallbackTime);
    const wasPlaying = options.wasPlaying ?? Boolean(audio && !audio.paused);

    updatePlayerStorage((storage) => ({
      ...storage,
      tracks: {
        ...storage.tracks,
        [storageKey]: {
          ...serializeStoredTrack(track, index),
          currentTime: Number.isFinite(currentTime)
            ? Math.max(0, currentTime)
            : 0,
          wasPlaying,
        },
      },
    }));
  }

  function savePlaybackSnapshot(options = {}) {
    saveTrackSnapshot(trackIndex, options);
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    const resumeTime = playContextRef.current.resumeTime || 0;

    if (!audio || resumeTime <= 0) return;

    const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    const nextTime = Math.min(resumeTime, Math.max(0, duration - 0.35));

    try {
      audio.currentTime = nextTime;
    } catch {
      return;
    }

    lastSavedSecondRef.current = Math.floor(audio.currentTime);
    playContextRef.current = {
      ...playContextRef.current,
      resumeTime: 0,
    };
    savePlaybackSnapshot({
      currentTime: audio.currentTime,
      wasPlaying: playing,
    });
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;

    const currentSecond = Math.floor(audio.currentTime);
    if (currentSecond === lastSavedSecondRef.current) return;

    lastSavedSecondRef.current = currentSecond;
    savePlaybackSnapshot({
      currentTime: audio.currentTime,
      wasPlaying: !audio.paused,
    });
  }

  function handleAudioPlay() {
    savePlaybackSnapshot({ wasPlaying: true });
  }

  function handleAudioPause() {
    savePlaybackSnapshot({ wasPlaying: false });
  }

  useEffect(() => {
    function handleBeforeUnload() {
      savePlaybackSnapshot();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  useEffect(() => {
    if (!player.enabled) return undefined;

    function handleSpaceKey(event) {
      const target = event.target;
      const isEditable =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);

      if (
        event.code !== "Space" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditable
      ) {
        return;
      }

      event.preventDefault();
      wakePlayer();
      playCurrent();
    }

    window.addEventListener("keydown", handleSpaceKey);
    return () => window.removeEventListener("keydown", handleSpaceKey);
  }, [
    player.enabled,
    audioSrc,
    current.mid,
    current.src,
    current.title,
    loading,
    playing,
    trackIndex,
    tracks.length,
  ]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!playerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!player.enabled) return undefined;

    const timer = window.setTimeout(() => {
      if (playerActive) return;
      setCompact(true);
    }, PLAYER_IDLE_DELAY);

    return () => window.clearTimeout(timer);
  }, [
    player.enabled,
    compact,
    open,
    trackIndex,
    playing,
    playMode,
    playerActive,
  ]);

  useEffect(() => {
    if (!open) return undefined;

    const frame = requestAnimationFrame(() => {
      trackRefs.current[trackIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [open, trackIndex, tracks.length]);

  async function selectTrack(index, shouldPlay = true, options = {}) {
    const track = tracks[index];
    if (!track) return;

    const requestId = ++playRequestRef.current;
    const failedIndexes = options.failedIndexes ?? [];
    const resumeTime = options.resumeTime ?? 0;

    setTrackIndex(index);
    setError("");
    lastSavedSecondRef.current = -1;
    saveTrackSnapshot(index, {
      currentTime: resumeTime,
      wasPlaying: shouldPlay,
    });

    if (track.src) {
      lastAudioErrorRef.current = "";
      playContextRef.current = { index, failedIndexes, resumeTime };
      setAudioSrc(track.src);
      setPlaying(shouldPlay);
      setLoading(false);
      return;
    }

    if (player.provider !== "qq" || !track.mid) {
      setPlaying(false);
      setAudioSrc("");
      if (shouldPlay && tracks.length > 1) {
        await skipToNextPlayable(index, "当前歌曲无法播放", failedIndexes);
      } else if (track.url) {
        window.open(track.url, "_blank", "noreferrer");
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        mid: track.mid,
        mediaMid: track.mediaMid || track.mid,
      });
      const response = await fetch(`/api/qq/song-url?${params}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "无法获取播放地址");
      }

      const playableUrl = data.url || await resolveQqPlayableUrl(data.resolver);

      if (!playableUrl) {
        throw new Error(data.error || "无法获取播放地址");
      }

      if (playRequestRef.current !== requestId) return;

      lastAudioErrorRef.current = "";
      playContextRef.current = { index, failedIndexes, resumeTime };
      setAudioSrc(playableUrl);
      setPlaying(shouldPlay);
    } catch (playError) {
      if (playRequestRef.current !== requestId) return;

      console.warn(playError);
      setPlaying(false);
      setAudioSrc("");
      if (shouldPlay && tracks.length > 1) {
        await skipToNextPlayable(
          index,
          playError.message || "当前歌曲无法播放",
          failedIndexes,
        );
      } else {
        setError(playError.message || "无法获取播放地址");
      }
    } finally {
      if (playRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  function getNextTrackIndex(fromIndex = trackIndex) {
    if (!tracks.length) return 0;
    if (playMode === "single") return fromIndex;
    if (playMode === "random") {
      if (tracks.length === 1) return fromIndex;
      let nextIndex = fromIndex;
      while (nextIndex === fromIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      }
      return nextIndex;
    }
    return (fromIndex + 1) % tracks.length;
  }

  function getNextPlayableIndex(fromIndex, failedIndexes) {
    if (!tracks.length) return 0;

    const failedSet = new Set(failedIndexes);

    if (playMode === "random") {
      const candidates = tracks
        .map((_, index) => index)
        .filter((index) => !failedSet.has(index));
      return candidates[Math.floor(Math.random() * candidates.length)] ?? fromIndex;
    }

    for (let offset = 1; offset <= tracks.length; offset += 1) {
      const nextIndex = (fromIndex + offset) % tracks.length;
      if (!failedSet.has(nextIndex)) return nextIndex;
    }

    return fromIndex;
  }

  async function skipToNextPlayable(failedIndex, reason, previousFailedIndexes = []) {
    const failedIndexes = Array.from(
      new Set([...previousFailedIndexes, failedIndex]),
    );

    if (!tracks.length || failedIndexes.length >= tracks.length) {
      setPlaying(false);
      setAudioSrc("");
      setError("当前歌单暂无可播放歌曲");
      return;
    }

    setError(`${reason}，已切到下一首`);
    await selectTrack(getNextPlayableIndex(failedIndex, failedIndexes), true, {
      failedIndexes,
    });
  }

  function playCurrent() {
    if (!audioSrc && current) {
      selectTrack(trackIndex, true);
      return;
    }
    setPlaying((value) => !value);
  }

  function playNext() {
    selectTrack(getNextTrackIndex(), true);
  }

  function togglePlayMode() {
    setPlayMode((mode) => {
      if (mode === "order") return "single";
      if (mode === "single") return "random";
      return "order";
    });
  }

  function handleEnded() {
    if (playMode === "single" && audioRef.current) {
      audioRef.current.currentTime = 0;
      savePlaybackSnapshot({
        currentTime: 0,
        wasPlaying: true,
      });
      audioRef.current.play().catch(() => setPlaying(false));
      return;
    }

    if (tracks.length > 1) {
      selectTrack(getNextTrackIndex(), true);
    } else {
      setPlaying(false);
      savePlaybackSnapshot({
        currentTime: 0,
        wasPlaying: false,
      });
    }
  }

  function handleAudioError() {
    const failedSrc = audioRef.current?.currentSrc || audioSrc;
    if (!failedSrc || lastAudioErrorRef.current === failedSrc) return;

    lastAudioErrorRef.current = failedSrc;
    savePlaybackSnapshot({ wasPlaying: false });
    const context = playContextRef.current;
    skipToNextPlayable(
      context.index ?? trackIndex,
      "音频加载失败",
      context.failedIndexes ?? [],
    );
  }

  if (!player.enabled) return null;

  return (
    <div
      className={`player glass ${open ? "open" : ""} ${compact ? "compact" : ""}`}
      id="player"
      ref={playerRef}
      onMouseEnter={handlePlayerEnter}
      onMouseLeave={handlePlayerLeave}
      onFocusCapture={handlePlayerEnter}
      onBlurCapture={handlePlayerLeave}
      onPointerDown={handlePlayerPointerDown}
    >
      <div className="player-toggle">
        <Music2 size={18} />
        <button
          type="button"
          className="player-title-button"
          onClick={handleTitleButtonClick}
          aria-label={open ? "收起播放器" : "展开播放器"}
        >
          <MarqueeTitle text={currentTitle} />
          <ChevronUp size={15} />
        </button>
        <div className="player-controls">
          <button
            type="button"
            onClick={playCurrent}
            disabled={loading}
            aria-label={playing ? "暂停" : "播放"}
            title={playing ? "暂停" : "播放"}
          >
            {playing ? <CirclePause size={20} /> : <CirclePlay size={20} />}
          </button>
          <button
            type="button"
            onClick={playNext}
            disabled={loading || tracks.length === 0}
            aria-label="下一曲"
            title="下一曲"
          >
            <SkipForward size={18} />
          </button>
          <button
            type="button"
            onClick={togglePlayMode}
            aria-label={playModeMeta.label}
            title={playModeMeta.label}
          >
            <PlayModeIcon size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="player-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="now-playing">
              <div className="cover-disc">
                {cover ? (
                  <img src={cover} alt="" />
                ) : (
                  <Volume2 />
                )}
              </div>
              <div>
                <strong>
                  <MarqueeTitle text={currentTitle} />
                </strong>
                <span>{currentArtist}</span>
              </div>
            </div>

            <div className="track-list">
              {tracks.map((track, index) => (
                <button
                  className={index === trackIndex ? "active" : ""}
                  key={`${track.title}-${index}`}
                  ref={(node) => {
                    trackRefs.current[index] = node;
                  }}
                  type="button"
                  onClick={() => {
                    selectTrack(index, true);
                  }}
                >
                  <MarqueeTitle text={track.title} />
                  <small>{formatDuration(track.duration)}</small>
                </button>
              ))}
            </div>
            {loading ? <p className="player-status">加载中...</p> : null}
            {error ? <p className="player-status error">{error}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        preload="none"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onEnded={handleEnded}
        onError={handleAudioError}
      />
    </div>
  );
}

function MarqueeTitle({ text }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const textElement = textRef.current;
      if (!container || !textElement) return;
      setScrolling(textElement.scrollWidth > container.clientWidth + 4);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);

  return (
    <span
      className={`marquee ${scrolling ? "scrolling" : ""}`}
      ref={containerRef}
    >
      <span className="marquee-track">
        <span ref={textRef}>{text}</span>
        {scrolling ? <span aria-hidden="true">{text}</span> : null}
      </span>
    </span>
  );
}

function formatDuration(duration) {
  if (!duration) return "";
  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function readPlayerStorage() {
  if (typeof window === "undefined") {
    return { playMode: "order", tracks: {} };
  }

  try {
    const storage = JSON.parse(
      window.localStorage.getItem(PLAYER_STORAGE_KEY) || "{}",
    );

    return {
      playMode: PLAYER_MODES.has(storage.playMode) ? storage.playMode : "order",
      tracks: storage.tracks && typeof storage.tracks === "object"
        ? storage.tracks
        : {},
    };
  } catch {
    return { playMode: "order", tracks: {} };
  }
}

function updatePlayerStorage(updater) {
  if (typeof window === "undefined") return;

  try {
    const storage = updater(readPlayerStorage());
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }
}

function getStoredPlayMode() {
  return readPlayerStorage().playMode;
}

function getPlayerStorageKey(player) {
  return [
    player.provider || "static",
    player.playlistUrl || player.title || "default",
  ].join(":");
}

function serializeStoredTrack(track, index) {
  return {
    index,
    mid: track.mid || "",
    mediaMid: track.mediaMid || "",
    src: track.src || "",
    url: track.url || "",
    title: track.title || "",
    artist: track.artist || "",
  };
}

function findStoredTrackIndex(tracks, storedTrack) {
  if (!storedTrack) return 0;

  const matchers = [
    (track) => storedTrack.mid && track.mid === storedTrack.mid,
    (track) => storedTrack.mediaMid && track.mediaMid === storedTrack.mediaMid,
    (track) => storedTrack.src && track.src === storedTrack.src,
    (track) => storedTrack.url && track.url === storedTrack.url,
    (track) =>
      storedTrack.title &&
      track.title === storedTrack.title &&
      (!storedTrack.artist || track.artist === storedTrack.artist),
  ];

  for (const matcher of matchers) {
    const matchIndex = tracks.findIndex(matcher);
    if (matchIndex !== -1) return matchIndex;
  }

  return Number.isInteger(storedTrack.index) &&
    storedTrack.index >= 0 &&
    storedTrack.index < tracks.length
    ? storedTrack.index
    : 0;
}

function resolveQqPlayableUrl(resolver) {
  if (resolver?.provider !== "qq-musicu-jsonp" || typeof window === "undefined") {
    return Promise.resolve("");
  }

  const mid = resolver.mid;
  const mediaMid = resolver.mediaMid || mid;

  if (!mid || !mediaMid) {
    return Promise.resolve("");
  }

  const callbackName = `__qqMusicVkey_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
  const payload = {
    req_0: {
      module: "vkey.GetVkeyServer",
      method: "CgiGetVkey",
      param: {
        guid: QQ_MUSIC_GUID,
        songmid: [mid],
        songtype: [0],
        uin: "0",
        loginflag: 1,
        platform: "20",
        filename: [`M500${mediaMid}.mp3`],
      },
    },
    comm: {
      uin: "0",
      format: "jsonp",
      ct: 24,
      cv: 0,
    },
  };
  const search = new URLSearchParams({
    callback: callbackName,
    g_tk: "5381",
    loginUin: "0",
    hostUin: "0",
    format: "jsonp",
    inCharset: "utf8",
    outCharset: "utf-8",
    notice: "0",
    platform: "yqq.json",
    needNewCode: "0",
    data: JSON.stringify(payload),
  });
  const script = document.createElement("script");
  script.src = `https://u.y.qq.com/cgi-bin/musicu.fcg?${search}`;
  script.async = true;

  return new Promise((resolve) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve("");
    }, 8000);

    window[callbackName] = (data) => {
      const info = data?.req_0?.data?.midurlinfo?.[0];
      const purl = info?.purl;
      const sip =
        data?.req_0?.data?.sip?.find((item) => item.startsWith("https://")) ||
        data?.req_0?.data?.sip?.[0] ||
        "https://dl.stream.qqmusic.qq.com/";

      cleanup();
      resolve(purl ? normalizeQqPlaybackUrl(new URL(purl, sip).toString()) : "");
    };

    script.onerror = () => {
      cleanup();
      resolve("");
    };

    document.head.appendChild(script);
  });
}

function normalizeQqPlaybackUrl(url) {
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

function getPlayModeMeta(mode) {
  if (mode === "single") {
    return { label: "单曲循环", Icon: Repeat1 };
  }
  if (mode === "random") {
    return { label: "随机播放", Icon: Shuffle };
  }
  return { label: "顺序播放", Icon: Repeat };
}

export function App() {
  const { config, status, updatedAt } = useRuntimeConfig();
  const posterBackground = usePosterBackground();
  const activeBackground =
    posterBackground.image || config?.appearance?.backgroundImage;
  const accentStyle = {
    "--accent": config?.appearance?.accent ?? defaultConfig.appearance.accent,
    "--accent-2": config?.appearance?.accent2 ?? defaultConfig.appearance.accent2,
    "--glass-strength":
      config?.appearance?.glassStrength ?? defaultConfig.appearance.glassStrength,
    backgroundImage: activeBackground
      ? `linear-gradient(120deg, rgba(8, 8, 10, .55), rgba(18, 18, 20, .74)), url(${activeBackground})`
      : undefined,
  };

  return (
    <main
      className={`home-shell poster-${posterBackground.orientation} ${config ? "config-ready" : "config-pending"}`}
      style={accentStyle}
    >
      <div className="grain" />
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="orbital-dot dot-a" />
      <div className="orbital-dot dot-b" />

      <ConfigPulse status={status} updatedAt={updatedAt} />

      {config ? <HomeView config={config} /> : null}
    </main>
  );
}

function HomeView({ config }) {
  const clock = useClock(config);
  const weather = useWeather(config, clock);
  const progress = useProgress(config.site.birthday);
  const { hitokoto, refreshHitokoto, loading: hitokotoLoading } = useHitokoto(config);
  const [capsuleOpen, setCapsuleOpen] = useState(false);

  return (
    <>
      <section
        className={`stage ${capsuleOpen ? "capsule-is-open" : ""}`}
        aria-label={config.site.name}
      >
        <motion.div
          className="identity-column"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.56, ease: "easeOut" }}
        >
          <div className="brand-lockup">
            <SakuraMark src={config.site.logoImage} label={config.site.name} />
            <h1>{config.site.logoText}</h1>
          </div>

          <QuoteCard
            quote={config.site.quote}
            capsuleOpen={capsuleOpen}
            onToggleCapsule={() => setCapsuleOpen((value) => !value)}
          />

          <SocialRail socials={config.socials} />
        </motion.div>

        <motion.div
          className="content-column"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.56, delay: 0.08, ease: "easeOut" }}
        >
          <InfoCard
            clock={clock}
            weather={weather}
            hitokoto={hitokoto}
            onRefreshHitokoto={refreshHitokoto}
            hitokotoLoading={hitokotoLoading}
          />
          <Links links={config.links} />
        </motion.div>

        <AnimatePresence>
          {capsuleOpen ? <TimeCapsule progress={progress} /> : null}
        </AnimatePresence>
      </section>

      <Player player={config.player} />

      <footer>{config.site.copyright}</footer>
    </>
  );
}
