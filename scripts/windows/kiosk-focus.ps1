# kiosk-focus.ps1 — haalt het kiosk-Chromevenster na het opstarten naar voren
# en geeft het toetsenbordfocus, zodat de barcodescanner direct werkt zonder
# eerst te klikken.
#
# Waarom zo omslachtig? Windows staat een proces dat niet zelf op de voorgrond
# staat niet toe om een ander venster naar voren te halen ("foreground lock").
# AppActivate werkte daarom niet betrouwbaar. Deze aanpak:
#   1. wacht tot er een zichtbaar Chrome-venster is (max 60 s);
#   2. drukt kort op Alt (dat heft de foreground lock op);
#   3. roept SetForegroundWindow aan;
#   4. klikt als laatste redmiddel één keer linksboven in de hoek — precies
#      de klik die nu met de hand gedaan wordt. Daar staat in het inlogscherm
#      alleen achtergrond, dus de klik raakt geen knop. Het scanveld pakt
#      daarna zelf de focus (LoginView zet die elke 300 ms terug).
#
# Aanroep vanuit start-kiosk.bat, direct na het starten van Chrome:
#   powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\materiaalhok-nieuw\scripts\windows\kiosk-focus.ps1"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
}
"@

$deadline = (Get-Date).AddSeconds(60)
$win = $null
while ((Get-Date) -lt $deadline) {
  $win = Get-Process chrome -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($win) { break }
  Start-Sleep -Milliseconds 500
}
if (-not $win) { exit 1 }

# Chrome even laten opbouwen.
Start-Sleep -Seconds 2
$h = $win.MainWindowHandle

# Alt indrukken en loslaten: daarna mag dit proces de voorgrond wisselen.
[Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
[Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[Win]::ShowWindow($h, 3) | Out-Null   # 3 = maximaliseren (kiosk is al fullscreen)
[Win]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 400

# Laatste redmiddel: één klik linksboven (achtergrond van het inlogscherm).
$x = 15
$y = 15
[Win]::SetCursorPos($x, $y) | Out-Null
[Win]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # links omlaag
[Win]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # links omhoog
exit 0
