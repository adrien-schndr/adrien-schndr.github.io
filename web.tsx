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
      const image = "/assets/spotify.svg";
      // Si un timestamp d'activité précédent est connu, on peut calculer le temps écoulé
      if (storedLastActivityTimestamp) {
        elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
      }
      return {
        shortenedName,
        image,
        isplaying: false,
        elapsedTimeSinceActivity_ms,
      };
    } else if (response.status === 204) {
      const shortenedName = "Currently Not Playing";
      const image = "/assets/spotify.svg";
      if (storedLastActivityTimestamp) {
        elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
      }
      return {
        shortenedName,
        image,
        elapsedTimeSinceActivity_ms,
        isplaying: false,
      };
    } else {
      const song = await response.json();
      const isPlaying = song.is_playing;

      if (!isPlaying) {
        const shortenedName = "Currently Not Playing";
        const image = "/assets/spotify.svg";
        // Utilise le timestamp stocké de la dernière chanson activement jouée
        if (storedLastActivityTimestamp) {
          elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
        }
        return {
          shortenedName,
          image,
          activityTimestamp: storedLastActivityTimestamp,
          elapsedTimeSinceActivity_ms,
          isplaying: false,
        };
      }

      // Si la chanson est en cours de lecture, mettez à jour le timestamp de la dernière activité stockée
      await blob.setJSON(LAST_PLAYED_TIMESTAMP_KEY, song.timestamp);

      // Pour une chanson en cours, elapsedTimeSinceActivity_ms indique la "fraîcheur" des données de Spotify
      elapsedTimeSinceActivity_ms = Date.now() - song.timestamp;

      const progress_ms = song.progress_ms;
      const duration_ms = song.item.duration_ms;
      const songImage = song.item.album.images[0].url; // Renommé pour éviter la confusion avec la variable image précédente
      const artistNames = song.item.artists.map(a => a.name);
      const artistLinks = song.item.artists.map(a => a.external_urls.spotify);
      const link = song.item.album.external_urls.spotify;
      const name = song.item.name;
      const shortenedName = (name.length > 30 ? name.replace(/\[[^\]]*\]/g, "").trim() : name).length > 30
        ? name.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim()
        : name;
      // const formattedArtist = artistNames.reduce((acc, name) => // Non utilisé dans le retour
      //   acc.length + name.length + (acc ? 2 : 0) > 30 ? acc : acc + (acc ? ", " : "") + name, "")
      //   + (artistNames.join(", ").length > 30 ? "..." : "");

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
    const image = "/assets/spotify.svg"; // image de fallback en cas d'erreur
    let elapsedTimeSinceActivity_ms = 0;
    if (storedLastActivityTimestamp) {
      elapsedTimeSinceActivity_ms = Date.now() - storedLastActivityTimestamp;
    }
    return {
      shortenedName,
      image,
      isplaying: false,
      elapsedTimeSinceActivity_ms,
    };
  }
};

export const NowPlaying = async () => Response.json(await getNowPlaying());