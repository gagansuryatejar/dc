' NEXUS AI - Silent Windows Background Runner
' Launches start-all.bat completely hidden from the desktop without visible console windows.

Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run Chr(34) & strPath & "\start-all.bat" & Chr(34), 0, False
Set WshShell = Nothing
