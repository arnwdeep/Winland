const { exec } = require('child_process');
const { EventEmitter } = require('events');

class MediaService extends EventEmitter {
  constructor() {
    super();
    this.pollTimer = null;
    this.inFlight = false;
    this.currentTrack = {
      title: 'Midnight City',
      artist: 'M83 - Hurry Up, We\'re Dreaming',
      album: 'Hurry Up, We\'re Dreaming',
      isPlaying: false,
      duration: 244,
      position: 72,
      source: 'Internal'
    };
  }

  init() {
    this.querySystemMedia();
    this.pollTimer = setInterval(() => this.querySystemMedia(), 3000);
  }

  querySystemMedia() {
    if (this.inFlight) return;
    this.inFlight = true;

    // Use PowerShell Windows Runtime API to inspect live active media session
    const psCmd = `powershell -NoProfile -Command "
      try {
        [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
        $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
        $manager = $asyncOp.GetAwaiter().GetResult()
        $session = $manager.GetCurrentSession()
        if ($session) {
          $propOp = $session.TryGetMediaPropertiesAsync()
          $props = $propOp.GetAwaiter().GetResult()
          $playback = $session.GetPlaybackInfo()
          $timeline = $session.GetTimelineProperties()

          $title = $props.Title
          $artist = $props.Artist
          $album = $props.AlbumTitle
          $status = $playback.PlaybackStatus.ToString() # Closed, Opened, Changing, Stopped, Playing, Paused
          $posSec = [Math]::Round($timeline.Position.TotalSeconds)
          $durSec = [Math]::Round($timeline.EndTime.TotalSeconds)
          $appId = $session.SourceAppUserModelId

          @{
            active = $true
            title = $title
            artist = $artist
            album = $album
            isPlaying = ($status -eq 'Playing')
            position = $posSec
            duration = $durSec
            appId = $appId
          } | ConvertTo-Json
        } else {
          @{ active = $false } | ConvertTo-Json
        }
      } catch {
        @{ active = $false, error = $_.Exception.Message } | ConvertTo-Json
      }
    "`;

    exec(psCmd, { timeout: 4000 }, (err, stdout) => {
      this.inFlight = false;
      if (err || !stdout.trim()) return;

      try {
        const data = JSON.parse(stdout);
        if (data.active && data.title) {
          const changed = (this.currentTrack.title !== data.title ||
                           this.currentTrack.isPlaying !== data.isPlaying ||
                           this.currentTrack.artist !== data.artist);
          this.currentTrack = {
            title: data.title || 'Unknown Title',
            artist: data.artist || (data.appId ? data.appId.split('!')[0] : 'Media Player'),
            album: data.album || '',
            isPlaying: !!data.isPlaying,
            position: data.position || 0,
            duration: data.duration || 180,
            source: data.appId || 'Windows Media'
          };
          if (changed) {
            this.emit('change', this.currentTrack);
          }
        }
      } catch (e) {
        // Fallback
      }
    });
  }

  sendMediaKey(keyName) {
    // Virtual key codes:
    // Play/Pause: 0xB3 (179)
    // Next: 0xB0 (176)
    // Prev: 0xB1 (177)
    let vk = 179;
    if (keyName === 'next') vk = 176;
    if (keyName === 'prev') vk = 177;

    const psCmd = `powershell -NoProfile -Command "
      Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);' -Name Win32Key -Namespace Win32;
      [Win32.Win32Key]::keybd_event(${vk}, 0, 0, 0);
      [Win32.Win32Key]::keybd_event(${vk}, 0, 2, 0);
    "`;

    exec(psCmd, { timeout: 2000 });

    if (keyName === 'playPause') {
      this.currentTrack.isPlaying = !this.currentTrack.isPlaying;
      this.emit('change', this.currentTrack);
    }

    setTimeout(() => this.querySystemMedia(), 500);
  }

  getTrack() {
    return this.currentTrack;
  }

  destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

module.exports = new MediaService();
