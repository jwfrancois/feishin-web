import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { MediaTypeProvider } from '@/context/MediaTypeContext';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { AlbumsPage } from '@/pages/AlbumsPage';
import { AlbumDetailPage } from '@/pages/AlbumDetailPage';
import { ArtistsPage } from '@/pages/ArtistsPage';
import { ArtistDetailPage } from '@/pages/ArtistDetailPage';
import { SongsPage } from '@/pages/SongsPage';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { PlaylistDetailPage } from '@/pages/PlaylistDetailPage';
import { GenresPage } from '@/pages/GenresPage';
import { GenreDetailPage } from '@/pages/GenreDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StatsPage } from '@/pages/StatsPage';
import { PodcastsPage } from '@/pages/PodcastsPage';
import { AudiobooksPage } from '@/pages/AudiobooksPage';
import { MusicMapPage } from '@/pages/MusicMapPage';
import { FoldersPage } from '@/pages/FoldersPage';
import { FolderContentsPage } from '@/pages/FolderContentsPage';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <PlayerProvider>
      <MediaTypeProvider>
        <AppLayout />
      </MediaTypeProvider>
    </PlayerProvider>
  );
}

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/album/:id" element={<AlbumDetailPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artist/:id" element={<ArtistDetailPage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/genre/:id" element={<GenreDetailPage />} />
            <Route path="/podcasts" element={<PodcastsPage />} />
            <Route path="/audiobooks" element={<AudiobooksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/map" element={<MusicMapPage />} />
            <Route path="/folders" element={<FoldersPage />} />
            <Route path="/folders/:folderId" element={<FolderContentsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
