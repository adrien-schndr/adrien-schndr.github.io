import { blob } from "https://esm.town/v/std/blob";
import { Buffer } from "node:buffer";
import querystring from "npm:querystring";

const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const client_id = Deno.env.get("client_id");
const client_secret = Deno.env.get("client_secret");
const refresh_token = Deno.env.get("refresh_token");

const LAST_PLAYED_TIMESTAMP_KEY = "lastPlayedSongTimestamp";

const getAccessToken = async (client_id, client_secret, refresh_token) => {
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  return response.json();
};

const getNowPlaying = async () => {
  const storedLastActivityTimestamp = await blob.getJSON(LAST_PLAYED_TIMESTAMP_KEY) || null;

  try {
    const { access_token } = await getAccessToken(client_id, client_secret, refresh_token);

    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let elapsedTimeSinceActivity_ms = 0;

    if (response.status > 400) {
      const shortenedName = "Error (Forbidden)";
      if (storedLastActivityTimestamp) {
        elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
      }
      return {
        shortenedName,
        isplaying: false,
        elapsedTimeSinceActivity_ms,
      };
    } else if (response.status === 204) {
      const shortenedName = "Currently Not Playing";
      if (storedLastActivityTimestamp) {
        elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
      }
      return {
        shortenedName,
        elapsedTimeSinceActivity_ms,
        isplaying: false,
      };
    } else {
      const song = await response.json();
      const isPlaying = song.is_playing;

      if (!isPlaying) {
        const shortenedName = "Currently Not Playing";
        if (storedLastActivityTimestamp) {
          elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
        }
        return {
          shortenedName,
          activityTimestamp: storedLastActivityTimestamp,
          elapsedTimeSinceActivity_ms,
          isplaying: false,
        };
      }

      await blob.setJSON(LAST_PLAYED_TIMESTAMP_KEY, song.timestamp);

      elapsedTimeSinceActivity_ms = Date.now() - song.timestamp;

      const progress_ms = song.progress_ms;
      const duration_ms = song.item.duration_ms;
      const songImage = song.item.album.images[0].url;
      const artistNames = song.item.artists.map(a => a.name);
      const artistLinks = song.item.artists.map(a => a.external_urls.spotify);
      const link = song.item.album.external_urls.spotify;
      const name = song.item.name;
      const shortenedName = (name.length > 30 ? name.replace(/\[[^\]]*\]/g, "").trim() : name).length > 30
        ? name.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim()
        : name;

      return {
        elapsedTimeSinceActivity_ms,
        isplaying: true,
        duration_ms,
        progress_ms,
        shortenedName,
        link,
        artistNames,
        artistLinks,
        image: songImage,
      };
    }
  } catch (error) {
    const shortenedName = `Error ${error.message}`;
    let elapsedTimeSinceActivity_ms = 0;
    if (storedLastActivityTimestamp) {
      elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
    }
    return {
      shortenedName,
      isplaying: false,
      elapsedTimeSinceActivity_ms,
    };
  }
};

export const NowPlaying = async () => Response.json(await getNowPlaying());