import type {
  AuthResult,
  Album,
  Artist,
  Track,
  Playlist,
  Genre,
  ItemsResponse,
  SearchResponse,
  ServerConfig,
  PodcastSeries,
  PodcastEpisode,
  Audiobook,
  AudiobookChapter,
  BaseItem,
} from '@/types/jellyfin';

const CLIENT_NAME = 'FeishinWeb';
const CLIENT_VERSION = '1.0.0';
const DEVICE_ID = 'feishin-web-' + Math.random().toString(36).substring(7);
const DEVICE_NAME = 'Web Browser';

function buildAuthHeader(token?: string): string {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${DEVICE_ID}"`,
    `Version="${CLIENT_VERSION}"`,
  ];
  if (token) {
    parts.unshift(`Token="${token}"`);
  }
  return `MediaBrowser ${parts.join(', ')}`;
}

class JellyfinAPI {
  private config: ServerConfig | null = null;

  setConfig(config: ServerConfig) {
    this.config = config;
  }

  getConfig(): ServerConfig | null {
    return this.config;
  }

  clearConfig() {
    this.config = null;
  }

  private get baseUrl(): string {
    return this.config?.url || '';
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: buildAuthHeader(this.config?.accessToken),
    };
  }

  async authenticate(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<AuthResult> {
    const url = `${serverUrl}/Users/AuthenticateByName`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify({ Username: username, Pw: password }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    return response.json();
  }

  async getAlbums(
    limit = 10000,
    startIndex = 0,
    sortBy = 'SortName',
    sortOrder = 'Ascending'
  ): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      limit: String(limit),
      startIndex: String(startIndex),
      sortBy,
      sortOrder,
      fields: 'PrimaryImageUrl,UserData,Overview,Genres',
      includeItemTypes: 'MusicAlbum',
      recursive: 'true',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getArtists(
    limit = 10000,
    startIndex = 0
  ): Promise<ItemsResponse<Artist>> {
    const params = new URLSearchParams({
      limit: String(limit),
      startIndex: String(startIndex),
      fields: 'PrimaryImageUrl,Genres,UserData',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Artists?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getArtist(artistId: string): Promise<Artist> {
    const response = await fetch(`${this.baseUrl}/Items/${artistId}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getArtistAlbums(artistId: string): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      artistIds: artistId,
      includeItemTypes: 'MusicAlbum',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData',
      sortBy: 'ProductionYear,SortName',
      sortOrder: 'Descending',
      limit: '10000',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getAlbum(albumId: string): Promise<Album> {
    const response = await fetch(`${this.baseUrl}/Items/${albumId}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getAlbumTracks(albumId: string): Promise<ItemsResponse<Track>> {
    const params = new URLSearchParams({
      parentId: albumId,
      includeItemTypes: 'Audio',
      fields: 'PrimaryImageUrl,MediaSources,UserData',
      sortBy: 'ParentIndexNumber,IndexNumber',
      limit: '10000',
      recursive: 'true',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getTracks(
    limit = 10000,
    startIndex = 0,
    sortBy = 'SortName'
  ): Promise<ItemsResponse<Track>> {
    const params = new URLSearchParams({
      limit: String(limit),
      startIndex: String(startIndex),
      sortBy,
      includeItemTypes: 'Audio',
      recursive: 'true',
      fields: 'PrimaryImageUrl,MediaSources,UserData',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getPlaylists(): Promise<ItemsResponse<Playlist>> {
    const params = new URLSearchParams({
      includeItemTypes: 'Playlist',
      recursive: 'true',
      fields: 'PrimaryImageUrl,ChildCount',
      limit: '10000',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getPlaylistTracks(playlistId: string): Promise<ItemsResponse<Track>> {
    const params = new URLSearchParams({
      fields: 'PrimaryImageUrl,MediaSources,UserData',
      limit: '10000',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(
      `${this.baseUrl}/Playlists/${playlistId}/Items?${params}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async getGenres(): Promise<ItemsResponse<Genre>> {
    const params = new URLSearchParams({
      includeItemTypes: 'Audio,MusicAlbum,AudioBook',
      fields: 'PrimaryImageUrl,ItemCounts',
      limit: '10000',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Genres?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getGenreById(genreId: string): Promise<Genre> {
    const response = await fetch(`${this.baseUrl}/Items/${genreId}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getAlbumsByGenreId(genreId: string, limit = 10000): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      genreIds: genreId,
      includeItemTypes: 'MusicAlbum,AudioBook',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData,Genres',
      sortBy: 'SortName',
      limit: String(limit),
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getGenreItems(genreId: string): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      genreIds: genreId,
      includeItemTypes: 'MusicAlbum',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData',
      limit: '10000',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async search(query: string, limit = 20): Promise<SearchResponse> {
    const params = new URLSearchParams({
      searchTerm: query,
      limit: String(limit),
      includeItemTypes: 'MusicAlbum,MusicArtist,Audio',
    });
    const response = await fetch(`${this.baseUrl}/Search/Hints?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getRecentlyPlayed(limit = 10): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      limit: String(limit),
      includeItemTypes: 'MusicAlbum',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getRecentlyAdded(limit = 10): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      limit: String(limit),
      includeItemTypes: 'MusicAlbum',
      sortBy: 'DateCreated',
      sortOrder: 'Descending',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getFavorites(limit = 20): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      limit: String(limit),
      includeItemTypes: 'MusicAlbum',
      filters: 'IsFavorite',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async toggleFavorite(itemId: string, isFavorite: boolean): Promise<void> {
    const method = isFavorite ? 'DELETE' : 'POST';
    await fetch(`${this.baseUrl}/Users/${this.config?.userId}/FavoriteItems/${itemId}`, {
      method,
      headers: this.headers,
    });
  }

  getImageUrl(itemId: string, type = 'Primary', width = 300): string {
    return `${this.baseUrl}/Items/${itemId}/Images/${type}?width=${width}&quality=90`;
  }

  getStreamUrl(itemId: string): string {
    const token = this.config?.accessToken || '';
    return `${this.baseUrl}/Audio/${itemId}/stream?api_key=${encodeURIComponent(token)}&static=true`;
  }

  async getRandomAlbums(limit = 12): Promise<ItemsResponse<Album>> {
    const params = new URLSearchParams({
      limit: String(limit),
      includeItemTypes: 'MusicAlbum',
      sortBy: 'Random',
      recursive: 'true',
      fields: 'PrimaryImageUrl,UserData',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getInstantMix(itemId: string, limit = 20): Promise<ItemsResponse<Track>> {
    const params = new URLSearchParams({
      limit: String(limit),
      fields: 'PrimaryImageUrl,MediaSources,UserData',
    });
    const response = await fetch(`${this.baseUrl}/Items/${itemId}/InstantMix?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getArtistTopTracks(artistId: string, limit = 10): Promise<ItemsResponse<Track>> {
    const params = new URLSearchParams({
      artistIds: artistId,
      includeItemTypes: 'Audio',
      sortBy: 'PlayCount',
      sortOrder: 'Descending',
      limit: String(limit),
      recursive: 'true',
      fields: 'PrimaryImageUrl,MediaSources,UserData',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // ============ Podcasts ============
  async getPodcasts(limit = 10000, startIndex = 0): Promise<ItemsResponse<PodcastSeries>> {
    // Try multiple strategies to find podcasts
    // Strategy 1: Filter by Podcast genre
    const params = new URLSearchParams({
      limit: String(limit),
      startIndex: String(startIndex),
      genres: 'Podcast',
      includeItemTypes: 'MusicAlbum,Folder,Series',
      recursive: 'true',
      sortBy: 'SortName',
      fields: 'PrimaryImageUrl,UserData,Overview,ChildCount,Genres,DateLastMediaAdded,PremiereDate',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    const result = await response.json();
    
    // If no results, try looking in library views for podcast collections
    if (result.Items.length === 0) {
      try {
        const viewsRes = await fetch(`${this.baseUrl}/Users/${this.config?.userId}/Views`, {
          headers: this.headers,
        });
        const views = await viewsRes.json();
        const podcastView = views.Items?.find((v: BaseItem) => 
          v.Name?.toLowerCase().includes('podcast') || v.CollectionType === 'podcasts'
        );
        if (podcastView) {
          const podParams = new URLSearchParams({
            parentId: podcastView.Id,
            limit: String(limit),
            recursive: 'true',
            sortBy: 'SortName',
            fields: 'PrimaryImageUrl,UserData,Overview,ChildCount,Genres,DateLastMediaAdded,PremiereDate',
            enableTotalRecordCount: 'true',
          });
          const podRes = await fetch(`${this.baseUrl}/Items?${podParams}`, {
            headers: this.headers,
          });
          return podRes.json();
        }
      } catch (e) {
        console.log('No podcast library view found');
      }
    }
    return result;
  }

  async getPodcastEpisodes(podcastId: string): Promise<ItemsResponse<PodcastEpisode>> {
    const params = new URLSearchParams({
      parentId: podcastId,
      includeItemTypes: 'Audio',
      sortBy: 'PremiereDate,SortName',
      sortOrder: 'Descending',
      fields: 'PrimaryImageUrl,MediaSources,UserData,Overview',
      limit: '10000',
      recursive: 'true',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // ============ Audiobooks ============
  async getAudiobooks(limit = 10000, startIndex = 0): Promise<ItemsResponse<Audiobook>> {
    // Try AudioBook type first
    const params1 = new URLSearchParams({
      limit: String(limit),
      startIndex: String(startIndex),
      includeItemTypes: 'AudioBook',
      recursive: 'true',
      sortBy: 'SortName',
      fields: 'PrimaryImageUrl,UserData,Overview,ChildCount,Genres',
      enableTotalRecordCount: 'true',
    });
    const response1 = await fetch(`${this.baseUrl}/Items?${params1}`, {
      headers: this.headers,
    });
    const result1 = await response1.json();
    
    // Also try genre filter as fallback
    const params2 = new URLSearchParams({
      limit: String(limit),
      startIndex: String(startIndex),
      genres: 'Audiobook',
      includeItemTypes: 'MusicAlbum',
      recursive: 'true',
      sortBy: 'SortName',
      fields: 'PrimaryImageUrl,UserData,Overview,ChildCount,Genres',
      enableTotalRecordCount: 'true',
    });
    const response2 = await fetch(`${this.baseUrl}/Items?${params2}`, {
      headers: this.headers,
    });
    const result2 = await response2.json();
    
    // Combine and dedupe results
    const allItems = [...result1.Items, ...result2.Items];
    const seen = new Set<string>();
    const uniqueItems = allItems.filter(item => {
      if (seen.has(item.Id)) return false;
      seen.add(item.Id);
      return true;
    });
    
    // If still no results, check library views
    if (uniqueItems.length === 0) {
      try {
        const viewsRes = await fetch(`${this.baseUrl}/Users/${this.config?.userId}/Views`, {
          headers: this.headers,
        });
        const views = await viewsRes.json();
        const audiobookView = views.Items?.find((v: BaseItem) => 
          v.Name?.toLowerCase().includes('audiobook') || v.CollectionType === 'audiobooks'
        );
        if (audiobookView) {
          const abParams = new URLSearchParams({
            parentId: audiobookView.Id,
            limit: String(limit),
            recursive: 'true',
            sortBy: 'SortName',
            fields: 'PrimaryImageUrl,UserData,Overview,ChildCount,Genres',
            enableTotalRecordCount: 'true',
          });
          const abRes = await fetch(`${this.baseUrl}/Items?${abParams}`, {
            headers: this.headers,
          });
          return abRes.json();
        }
      } catch (e) {
        console.log('No audiobook library view found');
      }
    }
    
    return { Items: uniqueItems, TotalRecordCount: uniqueItems.length, StartIndex: startIndex };
  }

  async getAudiobookChapters(audiobookId: string): Promise<ItemsResponse<AudiobookChapter>> {
    const params = new URLSearchParams({
      parentId: audiobookId,
      includeItemTypes: 'Audio',
      sortBy: 'ParentIndexNumber,IndexNumber,SortName',
      fields: 'PrimaryImageUrl,MediaSources,UserData',
      limit: '10000',
      recursive: 'true',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // ============ Continue Listening ============
  async getInProgress(limit = 20): Promise<ItemsResponse<Track>> {
    const params = new URLSearchParams({
      limit: String(limit),
      includeItemTypes: 'Audio',
      filters: 'IsResumable',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      recursive: 'true',
      fields: 'PrimaryImageUrl,MediaSources,UserData,Genres,SeriesName',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // ============ Playback Position ============
  async reportPlaybackProgress(itemId: string, positionTicks: number): Promise<void> {
    await fetch(`${this.baseUrl}/Sessions/Playing/Progress`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ItemId: itemId,
        PositionTicks: positionTicks,
      }),
    });
  }

  async reportPlaybackStopped(itemId: string, positionTicks: number): Promise<void> {
    await fetch(`${this.baseUrl}/Sessions/Playing/Stopped`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ItemId: itemId,
        PositionTicks: positionTicks,
      }),
    });
  }

  async markAsPlayed(itemId: string): Promise<void> {
    await fetch(`${this.baseUrl}/Users/${this.config?.userId}/PlayedItems/${itemId}`, {
      method: 'POST',
      headers: this.headers,
    });
  }

  async markAsUnplayed(itemId: string): Promise<void> {
    await fetch(`${this.baseUrl}/Users/${this.config?.userId}/PlayedItems/${itemId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
  }

  // ============ Get Items by Genre ============
  async getItemsByGenre(genre: string, type: 'Music' | 'Podcast' | 'Audiobook', limit = 10000): Promise<ItemsResponse<BaseItem>> {
    const params = new URLSearchParams({
      limit: String(limit),
      genres: genre,
      includeItemTypes: 'MusicAlbum,Audio,AudioBook',
      recursive: 'true',
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      fields: 'PrimaryImageUrl,UserData,Genres',
      enableTotalRecordCount: 'true',
    });
    const response = await fetch(`${this.baseUrl}/Items?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // ============ Library Views / Folders ============
  async getLibraryViews(): Promise<ItemsResponse<BaseItem>> {
    if (!this.config?.userId) {
      console.error('[API] getLibraryViews: No userId available in config', this.config);
      throw new Error('User not authenticated - userId is missing');
    }
    
    const url = `${this.baseUrl}/Users/${this.config.userId}/Views`;
    console.log('[API] getLibraryViews: Fetching from', url);
    
    const response = await fetch(url, {
      headers: this.headers,
    });
    
    console.log('[API] getLibraryViews: Response status', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] getLibraryViews: Error response', errorText);
      throw new Error(`Failed to fetch libraries: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[API] getLibraryViews: Received data', data);
    
    return data;
  }

  async getFolderItems(
    folderId: string,
    limit = 10000,
    startIndex = 0,
    sortBy = 'SortName',
    sortOrder = 'Ascending',
    filters?: { itemTypes?: string; searchTerm?: string }
  ): Promise<ItemsResponse<BaseItem>> {
    if (!this.config?.userId) {
      console.error('[API] getFolderItems: No userId available in config');
      throw new Error('User not authenticated - userId is missing');
    }
    
    const params = new URLSearchParams({
      parentId: folderId,
      recursive: 'true',
      limit: String(limit),
      startIndex: String(startIndex),
      sortBy,
      sortOrder,
      fields: 'PrimaryImageUrl,MediaSources,UserData,Overview,Genres,DateCreated,DatePlayed,PlayCount,RunTimeTicks',
      includeItemTypes: filters?.itemTypes || 'Audio,MusicAlbum,AudioBook,Folder',
      enableTotalRecordCount: 'true',
    });
    if (filters?.searchTerm) {
      params.set('searchTerm', filters.searchTerm);
    }
    
    const url = `${this.baseUrl}/Items?${params}`;
    console.log('[API] getFolderItems: Fetching from', url);
    
    const response = await fetch(url, {
      headers: this.headers,
    });
    
    console.log('[API] getFolderItems: Response status', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] getFolderItems: Error response', errorText);
      throw new Error(`Failed to fetch folder items: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[API] getFolderItems: Received', data.Items?.length || 0, 'items');
    
    return data;
  }

  async getItem(itemId: string): Promise<BaseItem> {
    const response = await fetch(`${this.baseUrl}/Items/${itemId}`, {
      headers: this.headers,
    });
    return response.json();
  }
}

export const jellyfinApi = new JellyfinAPI();
