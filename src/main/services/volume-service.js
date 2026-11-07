const { exec } = require('child_process');
const { EventEmitter } = require('events');

class VolumeService extends EventEmitter {
  constructor() {
    super();
    this.currentVolume = 50;
    this.isMuted = false;
    this.pollTimer = null;
    this.inFlight = false;
  }

  init() {
    this.queryVolume();
    this.pollTimer = setInterval(() => this.queryVolume(), 4000);
  }

  queryVolume() {
    if (this.inFlight) return;
    this.inFlight = true;

    // Use PowerShell to read current Master Volume via Windows CoreAudio API
    const psCmd = `powershell -NoProfile -Command "
      Add-Type -TypeDefinition @'
      using System;
      using System.Runtime.InteropServices;
      [Guid(\\"5CDF2C82-841E-4546-9722-0CF74078229A\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      public interface IAudioEndpointVolume {
          int SetMasterVolumeLevel(float fLevelDB, System.Guid pguidEventContext);
          int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
          int GetMasterVolumeLevel(out float pfLevelDB);
          int GetMasterVolumeLevelScalar(out float pfLevel);
          int SetChannelVolumeLevel(uint nChannel, float fLevelDB, System.Guid pguidEventContext);
          int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, System.Guid pguidEventContext);
          int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
          int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
          int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
          int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
      }
      [Guid(\\"D666063F-1587-4E43-81F1-B948E807363F\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      public interface IMMDevice {
          int Activate(ref System.Guid id, int clsCtx, System.IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
      }
      [Guid(\\"A95664D2-9614-4F35-A746-DE8DB63617E6\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      public interface IMMDeviceEnumerator {
          int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
      }
      [ComImport, Guid(\\"BCDE0395-E52F-467C-8E3D-C4579291692E\\")]
      public class MMDeviceEnumeratorComObject { }
      public class AudioHelper {
          public static float GetVolume() {
              var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
              IMMDevice dev = null;
              enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
              System.Guid IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
              object epvObj;
              dev.Activate(ref IID_IAudioEndpointVolume, 23, System.IntPtr.Zero, out epvObj);
              var epv = (IAudioEndpointVolume)epvObj;
              float vol = 0;
              epv.GetMasterVolumeLevelScalar(out vol);
              return vol * 100f;
          }
          public static bool GetMute() {
              var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
              IMMDevice dev = null;
              enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
              System.Guid IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
              object epvObj;
              dev.Activate(ref IID_IAudioEndpointVolume, 23, System.IntPtr.Zero, out epvObj);
              var epv = (IAudioEndpointVolume)epvObj;
              bool mute = false;
              epv.GetMute(out mute);
              return mute;
          }
      }
'@
      Write-Output ((@{ vol = [Math]::Round([AudioHelper]::GetVolume()); mute = [AudioHelper]::GetMute() }) | ConvertTo-Json)
    "`;

    exec(psCmd, { timeout: 5000 }, (err, stdout) => {
      this.inFlight = false;
      if (err || !stdout.trim()) return;

      try {
        const data = JSON.parse(stdout);
        const newVol = parseInt(data.vol, 10);
        const newMute = !!data.mute;

        const changed = (newVol !== this.currentVolume || newMute !== this.isMuted);
        this.currentVolume = isNaN(newVol) ? 50 : newVol;
        this.isMuted = newMute;

        if (changed) {
          this.emit('change', {
            volume: this.currentVolume,
            isMuted: this.isMuted
          });
        }
      } catch (e) {
        // Fallback
      }
    });
  }

  setVolume(percent) {
    percent = Math.max(0, Math.min(100, percent));
    this.currentVolume = percent;
    this.emit('change', { volume: this.currentVolume, isMuted: this.isMuted });

    const scalar = (percent / 100).toFixed(2);
    const psCmd = `powershell -NoProfile -Command "
      Add-Type -TypeDefinition @'
      using System;
      using System.Runtime.InteropServices;
      [Guid(\\"5CDF2C82-841E-4546-9722-0CF74078229A\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      public interface IAudioEndpointVolume {
          int SetMasterVolumeLevel(float fLevelDB, System.Guid pguidEventContext);
          int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
          int GetMasterVolumeLevel(out float pfLevelDB);
          int GetMasterVolumeLevelScalar(out float pfLevel);
          int SetChannelVolumeLevel(uint nChannel, float fLevelDB, System.Guid pguidEventContext);
          int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, System.Guid pguidEventContext);
          int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
          int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
          int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
          int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
      }
      [Guid(\\"D666063F-1587-4E43-81F1-B948E807363F\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      public interface IMMDevice {
          int Activate(ref System.Guid id, int clsCtx, System.IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
      }
      [Guid(\\"A95664D2-9614-4F35-A746-DE8DB63617E6\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      public interface IMMDeviceEnumerator {
          int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
      }
      [ComImport, Guid(\\"BCDE0395-E52F-467C-8E3D-C4579291692E\\")]
      public class MMDeviceEnumeratorComObject { }
      public class AudioHelper {
          public static void SetVolume(float scalar) {
              var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
              IMMDevice dev = null;
              enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
              System.Guid IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
              object epvObj;
              dev.Activate(ref IID_IAudioEndpointVolume, 23, System.IntPtr.Zero, out epvObj);
              var epv = (IAudioEndpointVolume)epvObj;
              epv.SetMasterVolumeLevelScalar(scalar, System.Guid.Empty);
          }
      }
'@
      [AudioHelper]::SetVolume(${scalar}f)
    "`;
    exec(psCmd, { timeout: 3000 });
  }

  destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

module.exports = new VolumeService();
