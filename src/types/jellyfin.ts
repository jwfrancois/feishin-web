export interface AuthResult {
  User: {
    Id: string;
    Name: string;
    ServerId: string;
  };
  AccessToken: string;
  ServerId: string;
}

export interface BaseItem {
  Id: string;
  Name: string;
  ServerId?: string;
  Type: string;
  CollectionType?: string;
  ImageTags?: {
    Primary?: string;
    Backdrop?: string[];
  };
  UserData?: {
    IsFavorite?: boolean;
    PlayCount?: number;
    LastPlayedDate?: string;
    Played?: boolean;
    PlaybackPositionTicks?: number;
    PlayedPercentage?: number;
  };
  Genres?: string[];
  Overview?: string;
}

export interface Artist extends BaseItem {
  Type: 'MusicArtist';
  AlbumCount?: number;
}

export interface Album extends BaseItem {
  Type: 'MusicAlbum';
  AlbumArtist?: string;
  AlbumArtists?: { Id: string; Name: string }[];
  Year?: number;
  PremiereDate?: string;
  ChildCount?: number;
  RunTimeTicks?: number;
}

export interface MediaStream {
  Codec?: string;
  BitRate?: number;
  SampleRate?: number;
  Channels?: number;
  BitDepth?: number;
  Type?: string;
}

export interface MediaSource {
  Id: string;
  Path?: string;
  Container?: string;
  Size?: number;
  BitRate?: number;
  MediaStreams?: MediaStream[];
}

export interface Track extends BaseItem {
  Type: 'Audio';
  Album?: string;
  AlbumId?: string;
  Artists?: string[];
  ArtistItems?: { Id: string; Name: string }[];
  IndexNumber?: number;
  ParentIndexNumber?: number;
  RunTimeTicks?: number;
  MediaSources?: MediaSource[];
  Container?: string;
  NormalizationGain?: number;
  SeriesName?: string;
  SeriesId?: string;
}

export interface Playlist extends BaseItem {
  Type: 'Playlist';
  MediaType?: string;
  ChildCount?: number;
}

export interface Genre extends BaseItem {
  Type: 'MusicGenre';
  ItemCounts?: {
    AlbumCount?: number;
    ArtistCount?: number;
    SongCount?: number;
    MusicVideoCount?: number;
    TotalCount?: number;
  };
}

// Podcast types
export interface PodcastSeries extends BaseItem {
  Type: 'Series' | 'Folder' | 'MusicAlbum';
  ChildCount?: number;
  RunTimeTicks?: number;
  DateLastMediaAdded?: string;
  PremiereDate?: string;
}

export interface PodcastEpisode extends Track {
  SeriesName?: string;
  SeriesId?: string;
  PremiereDate?: string;
}

// Audiobook types
export interface Audiobook extends BaseItem {
  Type: 'AudioBook' | 'MusicAlbum';
  Authors?: string[];
  AlbumArtist?: string;
  ChildCount?: number;
  RunTimeTicks?: number;
}

export interface AudiobookChapter extends Track {
  ParentId?: string;
}

export type MediaType = 'all' | 'music' | 'podcasts' | 'audiobooks';

export interface SearchHint {
  ItemId: string;
  Name: string;
  Type: string;
  MediaType?: string;
  Album?: string;
  AlbumArtist?: string;
  Artists?: string[];
  ThumbImageTag?: string;
}

export interface ItemsResponse<T> {
  Items: T[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface SearchResponse {
  SearchHints: SearchHint[];
  TotalRecordCount: number;
}

export interface ServerConfig {
  url: string;
  username: string;
  userId: string;
  accessToken: string;
  serverId: string;
}

// Audio quality types
export interface AudioQuality {
  codec: string;
  container: string;
  bitRate: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  isLossless: boolean;
  isHiRes: boolean;
  qualityLabel: string;
}

export function getAudioQuality(track: Track): AudioQuality {
  const source = track.MediaSources?.[0];
  const audioStream = source?.MediaStreams?.find(s => s.Type === 'Audio');
  
  const codec = audioStream?.Codec?.toUpperCase() || track.Container?.toUpperCase() || 'UNKNOWN';
  const container = source?.Container?.toUpperCase() || track.Container?.toUpperCase() || '';
  const bitRate = audioStream?.BitRate || source?.BitRate || 0;
  const sampleRate = audioStream?.SampleRate || 44100;
  const bitDepth = audioStream?.BitDepth || 16;
  const channels = audioStream?.Channels || 2;
  
  const losslessCodecs = ['FLAC', 'ALAC', 'WAV', 'AIFF', 'APE', 'WV', 'DSD'];
  const isLossless = losslessCodecs.includes(codec);
  const isHiRes = isLossless && (sampleRate > 48000 || bitDepth > 16);
  
  let qualityLabel = codec;
  if (isHiRes) {
    qualityLabel = `Hi-Res ${bitDepth}/${Math.round(sampleRate / 1000)}kHz`;
  } else if (isLossless) {
    qualityLabel = `Lossless ${codec}`;
  } else if (bitRate > 0) {
    qualityLabel = `${codec} ${Math.round(bitRate / 1000)}kbps`;
  }
  
  return {
    codec,
    container,
    bitRate,
    sampleRate,
    bitDepth,
    channels,
    isLossless,
    isHiRes,
    qualityLabel,
  };
}

export function isLowQuality(track: Track): boolean {
  const quality = getAudioQuality(track);
  return !quality.isLossless && quality.bitRate > 0 && quality.bitRate < 192000;
}

// Helper to detect media type from item
export function detectMediaType(item: BaseItem): MediaType {
  const genres = item.Genres?.map(g => g.toLowerCase()) || [];
  if (genres.includes('podcast') || item.Type === 'Series') return 'podcasts';
  if (genres.includes('audiobook') || item.Type === 'AudioBook') return 'audiobooks';
  return 'music';
}
