Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinLauncherDirect {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );
}
"@

# Remove ELECTRON_RUN_AS_NODE in this process before spawning
[System.Environment]::SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", $null, "Process")

$appPath = "C:\PROJECTS\Winland\node_modules\electron\dist\electron.exe"
$cmdLine = "`"$appPath`" `"C:\PROJECTS\Winland`""
$workDir = "C:\PROJECTS\Winland"

$si = New-Object WinLauncherDirect+STARTUPINFO
$si.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($si)
$si.lpDesktop = "Default"

$pi = New-Object WinLauncherDirect+PROCESS_INFORMATION

$res = [WinLauncherDirect]::CreateProcess(
    $appPath,
    $cmdLine,
    [IntPtr]::Zero,
    [IntPtr]::Zero,
    $false,
    0,
    [IntPtr]::Zero,
    $workDir,
    [ref]$si,
    [ref]$pi
)

$err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
Write-Output "Direct CreateProcess: $res, PID: $($pi.dwProcessId), Error: $err"
