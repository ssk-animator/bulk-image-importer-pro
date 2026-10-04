; Bulk Image Importer Pro — Inno Setup script
; Builds Bulk-Image-Importer-Pro-Setup-v1.0.0.exe
; Requires Inno Setup 6. Compile: iscc installer\BulkImageImporter.iss
; The installer ships the production manifest + PS bootstrapper and runs it
; per-user (no admin required for HKCU trusted catalog).

#define MyAppName "Bulk Image Importer Pro"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Bulk Image Importer Pro"
#define MyAppURL "https://bulk-image-importer-pro.pages.dev"

[Setup]
AppId={{F6B7D875-25AA-469E-88EC-DF2BF16318AA}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
DefaultDirName={autopf}\BulkImageImporterPro
DefaultGroupName={#MyAppName}
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\release
OutputBaseFilename=Bulk-Image-Importer-Pro-Setup-v{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName} (Excel Add-in bootstrap)

[Files]
Source: "Install-BulkImageImporter.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\release\manifest.xml"; DestDir: "{app}"; DestName: "manifest.xml"; Flags: ignoreversion
Source: "..\release\README.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy RemoteSigned -File ""{app}\Install-BulkImageImporter.ps1"" -Install"; StatusMsg: "Registering Excel trusted catalog..."; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy RemoteSigned -File ""{app}\Install-BulkImageImporter.ps1"" -Uninstall"; Flags: runhidden waituntilterminated; RunOnceId: "UnregisterTrustedCatalog"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
